// Estado de Cuenta — per-row PDF icon (READ action, real click). One click per row; listens for
// download / popup / navigation / responses. Then NV-01 (Back) and BT-07 (feedback) observations.
import fs from 'fs';
import path from 'path';
import { startSession, go, shot, saveEvidence, saveText, serverErrorSignature, AUDIT_ROOT, BASE_URL } from '../../support/phase4.ts';
import { shimName, L, SCREEN } from './docs-common.ts';

const s = await startSession({ name: 'p4-docs-estado-pdf', acceptDownloads: true });
const page = s.page;
await shimName(page);
const SC = SCREEN.estado;
const EV = path.join(AUDIT_ROOT, 'logs', 'evidence');
fs.mkdirSync(EV, { recursive: true });

await go(page, 'Estado.aspx');
await page.waitForLoadState('networkidle').catch(() => {});
const rows = await page.evaluate(() =>
  Array.from(document.querySelectorAll('#cpBody_gvDatos tr[id*="DXDataRow"]')).map((r) => ({
    id: r.id,
    factura: r.querySelectorAll(':scope > td')[1]?.textContent?.trim(),
    btn: (r.querySelector('div[id*="iPrint"]:not([id$="_CD"])') as HTMLElement | null)?.id,
  }))
);
console.log('rows', JSON.stringify(rows));

const results: any[] = [];
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  if (i > 0) {
    await go(page, 'Estado.aspx');
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  const rec: any = { row: i, factura: row.factura, button: row.btn, responses: [], download: null, popup: null, navigation: null, feedback: null };
  const responses: any[] = [];
  const onResp = async (r: any) => {
    const ct = r.headers()['content-type'] || '';
    if (r.request().resourceType() === 'document' || /pdf|octet|json/.test(ct) || r.request().method() === 'POST') {
      responses.push({ status: r.status(), method: r.request().method(), url: r.url(), ct, cd: r.headers()['content-disposition'] || null, ts: new Date().toISOString() });
    }
  };
  page.on('response', onResp);
  const dlP = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  const popP = page.context().waitForEvent('page', { timeout: 15000 }).catch(() => null);
  const urlBefore = page.url();
  const t0 = Date.now();
  await page.click(`#${row.btn}`);
  // feedback right after click
  await page.waitForTimeout(300);
  rec.feedback = await page.evaluate((id) => {
    const b = document.getElementById(id);
    return b ? { cls: b.className, disabled: b.getAttribute('aria-disabled') || (b.querySelector('input') as HTMLInputElement | null)?.disabled, loadingPanel: !!document.querySelector('.dxgvLoadingPanel_Office365, .dxlpLoadingPanel_Office365, [id*="LP"]:not([style*="display: none"])'), title: document.title } : { gone: true, title: document.title };
  }, row.btn).catch((e) => ({ err: e.message.slice(0, 100) }));
  const [dl, pop] = await Promise.all([dlP, popP]);
  await page.waitForTimeout(1500);
  page.off('response', onResp);
  rec.responses = responses;
  rec.elapsedMs = Date.now() - t0;
  rec.navigation = { before: urlBefore, after: page.url(), title: await page.title() };
  if (dl) {
    const suggested = dl.suggestedFilename();
    const ext = path.extname(suggested) || '.bin';
    const dest = path.join(EV, `estado-row${i}${ext}`);
    let failure: string | null = null;
    try {
      await dl.saveAs(dest);
    } catch (e: any) {
      failure = e.message?.slice(0, 200);
    }
    failure = failure || (await dl.failure());
    const buf = fs.existsSync(dest) ? fs.readFileSync(dest) : Buffer.alloc(0);
    rec.download = { suggested, url: dl.url(), dest: `audit/logs/evidence/estado-row${i}${ext}`, size: buf.length, magic: buf.subarray(0, 5).toString('latin1'), isPdf: buf.subarray(0, 4).toString('latin1') === '%PDF', failure, head: buf.subarray(0, 200).toString('latin1') };
  }
  if (pop) {
    await pop.waitForLoadState('domcontentloaded').catch(() => {});
    await pop.waitForTimeout(2000);
    const purl = pop.url();
    const html = await pop.content().catch(() => '');
    const popShot = `audit/screenshots/estado-row${i}-popup.png`;
    await pop.screenshot({ path: path.join(AUDIT_ROOT, 'screenshots', `estado-row${i}-popup.png`), fullPage: true }).catch(() => {});
    rec.popup = { url: purl, title: await pop.title().catch(() => ''), isPdfViewer: /pdf/i.test(purl) || html.includes('type="application/pdf"') || html.includes('embed'), serverError: serverErrorSignature(html), htmlLen: html.length, shot: popShot };
    // if popup is an in-browser PDF, try to fetch it via the context to verify magic bytes
    if (purl && !/^about:/.test(purl)) {
      try {
        const r = await page.request.get(purl);
        const b = await r.body();
        const ct = r.headers()['content-type'] || '';
        const ext = /pdf/.test(ct) ? '.pdf' : '.html';
        const dest = path.join(EV, `estado-row${i}-popup${ext}`);
        fs.writeFileSync(dest, b);
        rec.popup.fetched = { status: r.status(), ct, size: b.length, isPdf: b.subarray(0, 4).toString('latin1') === '%PDF', dest: `audit/logs/evidence/estado-row${i}-popup${ext}` };
      } catch (e: any) {
        rec.popup.fetched = { err: e.message?.slice(0, 120) };
      }
    }
    await pop.close().catch(() => {});
  }
  // same-tab result: did the page itself turn into a PDF or an error?
  const html = await page.content().catch(() => '');
  rec.sameTab = { serverError: serverErrorSignature(html), title: await page.title(), isPdfEmbed: html.includes('application/pdf') || html.includes('<embed'), bodyStart: (await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300)).catch(() => '')) };
  // if same tab navigated to a non-HTML document, fetch it
  const docResp = responses.find((r) => r.request === undefined && r.status && r.method === 'POST');
  rec.mainPost = docResp || null;
  if (page.url() !== urlBefore) {
    try {
      const r = await page.request.get(page.url());
      const b = await r.body();
      const ct = r.headers()['content-type'] || '';
      rec.navigation.fetched = { status: r.status(), ct, size: b.length, isPdf: b.subarray(0, 4).toString('latin1') === '%PDF' };
      if (rec.navigation.fetched.isPdf) {
        const dest = path.join(EV, `estado-row${i}.pdf`);
        fs.writeFileSync(dest, b);
        rec.navigation.fetched.dest = `audit/logs/evidence/estado-row${i}.pdf`;
      }
    } catch (e: any) {
      rec.navigation.fetched = { err: e.message?.slice(0, 120) };
    }
  }
  await shot(page, `estado-row${i}-after-click`);
  results.push(rec);
  console.log(JSON.stringify(rec, null, 1));

  // NV-01 only on the first row: Back after the action
  if (i === 0) {
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch((e) => console.log('goBack err', e.message));
    await page.waitForTimeout(1200);
    const backHtml = await page.content().catch(() => '');
    const backInfo = { url: page.url(), title: await page.title(), rows: await page.locator('#cpBody_gvDatos tr[id*="DXDataRow"]').count(), serverError: serverErrorSignature(backHtml), bodyStart: (await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200)).catch(() => '')) };
    console.log('NV-01 back:', JSON.stringify(backInfo));
    await shot(page, 'estado-nv01-back');
    L(SC, 'NV-01', 'Estado.aspx (Back tras acción PDF fila 0)', backInfo.serverError || /Login\.aspx/.test(backInfo.url) ? 'fail' : 'pass', {
      reason: `Tras Back: url=${backInfo.url} filas=${backInfo.rows} error=${backInfo.serverError}`,
      evidence: ['audit/screenshots/estado-nv01-back.png'],
    });
  }
}
const ev = saveEvidence('estado-pdf-clicks', results);

for (const rec of results) {
  const ok = (rec.download && rec.download.isPdf && rec.download.size > 100) || (rec.popup && (rec.popup.fetched?.isPdf || rec.popup.isPdfViewer) && !rec.popup.serverError) || (rec.navigation.fetched?.isPdf);
  const nothing = !rec.download && !rec.popup && rec.navigation.before === rec.navigation.after && !rec.sameTab.isPdfEmbed;
  L(SC, 'TB-10', `#${rec.button} (factura ${rec.factura})`, ok ? 'pass' : 'fail', {
    findingIds: ok ? [] : ['EC-05'],
    reason: ok
      ? `PDF válido: ${rec.download ? `descarga ${rec.download.suggested} ${rec.download.size} B` : rec.popup ? `popup ${rec.popup.url}` : `navegación ${rec.navigation.after}`}`
      : nothing
        ? `Sin descarga, sin popup, sin navegación; respuestas: ${rec.responses.map((r: any) => `${r.method} ${r.status} ${r.ct}`).join(' | ')}; error=${rec.sameTab.serverError}`
        : `Resultado no válido: download=${JSON.stringify(rec.download)} popup=${JSON.stringify(rec.popup)} nav=${JSON.stringify(rec.navigation)} sameTab=${JSON.stringify(rec.sameTab)}`,
    evidence: [ev, `audit/screenshots/estado-row${rec.row}-after-click.png`, rec.download?.dest, rec.popup?.shot].filter(Boolean),
  });
}
const fb = results.map((r) => r.feedback);
L(SC, 'BT-07', 'iconos PDF (feedback tras clic)', 'executed-static', {
  reason: `Estado del botón 300 ms tras clic: ${JSON.stringify(fb)}; tiempo hasta resultado: ${results.map((r) => r.elapsedMs + 'ms').join(', ')}`,
  evidence: [ev],
});
await s.close();
console.log('done');
