// Prueba de Exportación (PruebaExportacion.aspx) — TB-01/03/04/06/08/10/12, per-row Imprimir (real click
// where enabled), BT-06/07/11, CC-01. TB-07/RS/AX live in docs-responsive-axe.ts.
import fs from 'fs';
import path from 'path';
import { startSession, go, shot, saveEvidence, saveText, serverErrorSignature, AUDIT_ROOT } from '../../support/phase4.ts';
import { shimName, L, SCREEN, tabTraverse, overflowInfo } from './docs-common.ts';

const s = await startSession({ name: 'p4-docs-prueba', acceptDownloads: true });
const page = s.page;
await shimName(page);
const SC = SCREEN.prueba;
const EV = path.join(AUDIT_ROOT, 'logs', 'evidence');

await go(page, 'PruebaExportacion.aspx');
await page.waitForLoadState('networkidle').catch(() => {});

async function gridSnapshot() {
  return page.evaluate(() => {
    const g = document.querySelector('#cpBody_gvDatos');
    const rows = Array.from(document.querySelectorAll('#cpBody_gvDatos tr[id*="DXDataRow"]')).map((r) => {
      const printA = r.querySelector('a.dxgv__cci') as HTMLAnchorElement | null;
      const printImg = printA?.querySelector('img');
      const expA = r.querySelector('a.dxgvADSB') as HTMLAnchorElement | null;
      return {
        id: r.id,
        cells: Array.from(r.querySelectorAll(':scope > td')).map((c) => c.textContent?.replace(/<!--[\s\S]*?-->/g, '').trim().slice(0, 60)),
        print: printA
          ? {
              id: printA.id,
              cls: printA.className,
              disabledClass: /dxbDisabled/.test(printA.className),
              ariaDisabled: printA.getAttribute('aria-disabled'),
              tabindex: printA.getAttribute('tabindex'),
              dataArgs: printA.getAttribute('data-args'),
              imgCls: printImg?.className,
              imgAlt: printImg?.getAttribute('alt'),
              imgTitle: printImg?.getAttribute('title'),
              cursor: getComputedStyle(printA).cursor,
              opacity: getComputedStyle(printImg || printA).opacity,
              size: `${Math.round(printA.getBoundingClientRect().width)}x${Math.round(printA.getBoundingClientRect().height)}`,
            }
          : null,
        expander: expA ? { id: expA.id, visible: expA.offsetParent !== null, disabledClass: /dxbDisabled/.test(expA.className), imgAlt: expA.querySelector('img')?.getAttribute('alt') } : null,
      };
    });
    const headers = Array.from(document.querySelectorAll('#cpBody_gvDatos td[class*="dxgvHeader"]')).map((h) => ({ id: h.id, text: h.textContent?.trim(), sortImg: !!h.querySelector('img[class*="Sort"]'), ariaSort: h.getAttribute('aria-sort') }));
    return {
      rows,
      headers,
      ths: g ? g.querySelectorAll('th').length : null,
      role: g?.getAttribute('role'),
      pager: document.querySelectorAll('#cpBody_gvDatos [id*="DXPager"], #cpBody_gvDatos .dxpLite_Office365').length,
      filterRow: document.querySelectorAll('#cpBody_gvDatos [id*="DXFilterRow"]').length,
      emptyRow: document.querySelectorAll('#cpBody_gvDatos [id*="DXEmptyRow"]').length,
      pageTitle: document.querySelector('.page-title-heading')?.textContent?.replace(/\s+/g, ' ').trim(),
      hiddenSection: (() => {
        const h5 = Array.from(document.querySelectorAll('h5')).find((h) => /Historial/.test(h.textContent || ''));
        const box = h5?.closest('.modal, .card, div');
        return h5 ? { text: h5.textContent?.trim(), visible: (h5 as HTMLElement).offsetParent !== null, container: box ? `${box.tagName}#${box.id}.${box.className}` : null } : null;
      })(),
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1500),
    };
  });
}
const snap = await gridSnapshot();
const snapEv = saveEvidence('prueba-grid-snapshot', snap);
const baseShot = await shot(page, 'prueba-1440');
console.log(JSON.stringify({ headers: snap.headers.map((h) => h.text), rows: snap.rows, ths: snap.ths, pager: snap.pager, filter: snap.filterRow, hidden: snap.hiddenSection }, null, 1));

L(SC, 'TB-01', '#cpBody_gvDatos', 'omitted', { reason: `La cuenta tiene ${snap.rows.length} filas; estado vacío no observable (DXEmptyRow=${snap.emptyRow})` });
L(SC, 'TB-03', '#cpBody_gvDatos', 'omitted', { reason: 'No hay cuenta de alto volumen disponible (4 filas); sin filtro para forzar más datos' });
L(SC, 'TB-04', '#cpBody_gvDatos', 'fail', { findingIds: ['EC-01'], reason: `pager=${snap.pager} filterRow=${snap.filterRow}; sin filtro/búsqueda/paginación (mismo patrón que Estado, EC-01)`, evidence: [snapEv, baseShot] });
L(SC, 'TB-08', '#cpBody_gvDatos', snap.ths === 0 ? 'fail' : 'pass', { findingIds: snap.ths === 0 ? ['EC-02'] : [], reason: `th=${snap.ths} role=${snap.role}; cabeceras <td class=dxgvHeader> (patrón EC-02)`, evidence: [snapEv] });

// TB-12 sort
const sortResults: any[] = [];
for (const h of snap.headers.filter((x) => x.text && x.id)) {
  const before = (await gridSnapshot()).rows.map((r) => r.cells[1]).join('|');
  const posts: string[] = [];
  const onReq = (req: any) => { if (req.method() === 'POST') posts.push(req.url()); };
  page.on('request', onReq);
  let err: string | null = null;
  try { await page.click(`#${h.id}`, { timeout: 5000 }); await page.waitForTimeout(2500); } catch (e: any) { err = e.message?.slice(0, 100); }
  page.off('request', onReq);
  const after = await gridSnapshot();
  const afterKeys = after.rows.map((r) => r.cells[1]).join('|');
  const hdr = after.headers.find((x) => x.id === h.id);
  sortResults.push({ header: h.text, before, after: afterKeys, changed: before !== afterKeys, posts: posts.length, sortImg: hdr?.sortImg, err, serverError: serverErrorSignature(await page.content()) });
  console.log('sort', h.text, 'changed', before !== afterKeys, 'posts', posts.length, 'sortImg', hdr?.sortImg, err || '');
}
const sortEv = saveEvidence('prueba-sort-attempts', sortResults);
const sortable = sortResults.filter((r) => r.changed || r.sortImg).map((r) => r.header);
L(SC, 'TB-12', '#cpBody_gvDatos cabeceras', sortResults.some((r) => r.serverError) ? 'fail' : sortable.length ? 'pass' : 'executed-static', {
  reason: sortable.length ? `Ordenación activa en: ${sortable.join(', ')}; sin error` : 'Ninguna cabecera ordena',
  evidence: [sortEv],
});
await go(page, 'PruebaExportacion.aspx');
await page.waitForLoadState('networkidle').catch(() => {});

// TB-10 + real click on Imprimir per row (disabled → document; enabled → click & verify PDF)
const snap2 = await gridSnapshot();
const clickResults: any[] = [];
for (let i = 0; i < snap2.rows.length; i++) {
  const row = snap2.rows[i];
  const p = row.print!;
  const rec: any = { row: i, guia: row.cells[1], estatus: row.cells[6], print: p };
  const posts: any[] = [];
  const onResp = async (r: any) => { if (r.request().method() === 'POST' || r.request().resourceType() === 'document') posts.push({ status: r.status(), method: r.request().method(), url: r.url(), ct: r.headers()['content-type'] }); };
  page.on('response', onResp);
  const dlP = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  const popP = page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
  const urlBefore = page.url();
  try {
    await page.click(`#${p.id}`, { timeout: 5000, force: p.disabledClass });
  } catch (e: any) {
    rec.clickErr = e.message?.slice(0, 120);
  }
  const [dl, pop] = await Promise.all([dlP, popP]);
  await page.waitForTimeout(1000);
  page.off('response', onResp);
  rec.posts = posts;
  rec.urlAfter = page.url();
  rec.download = null;
  if (dl) {
    const ext = path.extname(dl.suggestedFilename()) || '.bin';
    const dest = path.join(EV, `prueba-row${i}${ext}`);
    await dl.saveAs(dest).catch(() => {});
    const buf = fs.existsSync(dest) ? fs.readFileSync(dest) : Buffer.alloc(0);
    rec.download = { suggested: dl.suggestedFilename(), url: dl.url(), size: buf.length, isPdf: buf.subarray(0, 4).toString('latin1') === '%PDF', dest: `audit/logs/evidence/prueba-row${i}${ext}` };
  }
  if (pop) {
    await pop.waitForLoadState('domcontentloaded').catch(() => {});
    rec.popup = { url: pop.url(), title: await pop.title().catch(() => '') };
    await pop.screenshot({ path: path.join(AUDIT_ROOT, 'screenshots', `prueba-row${i}-popup.png`) }).catch(() => {});
    await pop.close().catch(() => {});
  }
  rec.serverError = serverErrorSignature(await page.content());
  clickResults.push(rec);
  console.log(JSON.stringify(rec));
  if (page.url() !== urlBefore || rec.serverError) {
    await go(page, 'PruebaExportacion.aspx');
    await page.waitForLoadState('networkidle').catch(() => {});
  }
}
const clickEv = saveEvidence('prueba-print-clicks', clickResults);
await shot(page, 'PE-01');
const statuses = [...new Set(snap2.rows.map((r) => r.cells[6]))];
const allDisabled = snap2.rows.every((r) => r.print?.disabledClass);
for (const rec of clickResults) {
  if (rec.print.disabledClass) {
    L(SC, 'TB-10', `#${rec.print.id} (guía ${rec.guia}, estatus '${rec.estatus}')`, 'fail', {
      findingIds: ['PE-01'],
      reason: `Icono deshabilitado (class dxbDisabled, sprite ${rec.print.imgCls}, cursor ${rec.print.cursor}); clic forzado → posts=${rec.posts.length} download=${!!rec.download} popup=${!!rec.popup}; sin tooltip/explicación`,
      evidence: [clickEv, 'audit/screenshots/PE-01.png'],
    });
  } else {
    const ok = rec.download?.isPdf;
    L(SC, 'TB-10', `#${rec.print.id} (guía ${rec.guia}, estatus '${rec.estatus}')`, ok ? 'pass' : 'fail', {
      findingIds: ok ? [] : ['PE-02'],
      reason: ok ? `PDF válido ${rec.download.size} B` : `Icono habilitado pero sin PDF válido: ${JSON.stringify({ posts: rec.posts, download: rec.download, popup: rec.popup, err: rec.serverError })}`,
      evidence: [clickEv],
    });
  }
}
L(SC, 'TB-10', 'correlación estatus ↔ Imprimir', 'executed-static', {
  reason: `Estatus presentes: ${statuses.join(' / ')}; iconos deshabilitados en ${snap2.rows.filter((r) => r.print?.disabledClass).length}/${snap2.rows.length} filas (todos=${allDisabled}) → no hay correlación observable con el estatus; data-args del botón: ${snap2.rows[0].print?.dataArgs}`,
  evidence: [clickEv],
});

// TB-06 row-detail expander: at 1440 adaptive detail buttons are hidden; try at 768 and 375
const expResults: any[] = [];
for (const w of [1440, 768, 375]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(800);
  const info = await overflowInfo(page);
  const exp = await page.evaluate(() => Array.from(document.querySelectorAll('#cpBody_gvDatos a.dxgvADSB')).map((a) => ({ id: a.id, visible: (a as HTMLElement).offsetParent !== null })));
  const rec: any = { width: w, overflow: info.overflow, hiddenAdaptive: info.hiddenAdaptiveCells, expanders: exp };
  const visible = exp.filter((e) => e.visible);
  if (visible.length) {
    const before = await page.locator('#cpBody_gvDatos tr[id*="DXDataRow"]').count();
    await page.click(`#${visible[0].id}`).catch((e) => (rec.err1 = e.message.slice(0, 100)));
    await page.waitForTimeout(1500);
    rec.afterFirst = { detailRows: await page.locator('#cpBody_gvDatos tr[class*="dxgvADR"], #cpBody_gvDatos tr[id*="DXAdaptiveDetail"], #cpBody_gvDatos .dxgvAdaptiveDetail').count(), rows: await page.locator('#cpBody_gvDatos tr[id*="DXDataRow"]').count(), before, serverError: serverErrorSignature(await page.content()), overflow: (await overflowInfo(page)).overflow };
    if (visible.length > 1) {
      await page.click(`#${visible[1].id}`).catch((e) => (rec.err2 = e.message.slice(0, 100)));
      await page.waitForTimeout(1500);
      rec.afterSecond = { detailRows: await page.locator('#cpBody_gvDatos tr[class*="dxgvADR"], #cpBody_gvDatos tr[id*="DXAdaptiveDetail"], #cpBody_gvDatos .dxgvAdaptiveDetail').count(), serverError: serverErrorSignature(await page.content()) };
    }
    await shot(page, `prueba-expander-${w}`);
    rec.detailText = await page.evaluate(() => Array.from(document.querySelectorAll('#cpBody_gvDatos tr[class*="dxgvADR"], #cpBody_gvDatos .dxgvAdaptiveDetail')).map((n) => (n as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 300)));
    // collapse
    const hideBtn = await page.evaluate(() => { const a = Array.from(document.querySelectorAll('#cpBody_gvDatos a.dxgvADHB')).find((x) => (x as HTMLElement).offsetParent !== null); return a ? a.id : null; });
    if (hideBtn) { await page.click(`#${hideBtn}`).catch(() => {}); await page.waitForTimeout(1000); rec.afterCollapse = await page.locator('#cpBody_gvDatos tr[class*="dxgvADR"], #cpBody_gvDatos .dxgvAdaptiveDetail').count(); }
  }
  expResults.push(rec);
  console.log(JSON.stringify(rec));
}
const expEv = saveEvidence('prueba-expander', expResults);
const anyExp = expResults.find((r) => r.afterFirst);
L(SC, 'TB-06', '#cpBody_gvDatos a.dxgvADSB ("...")', anyExp ? (anyExp.afterFirst.serverError ? 'fail' : 'pass') : 'omitted', {
  reason: anyExp ? `Expansor visible a ${anyExp.width}px: filas detalle tras 1º clic=${anyExp.afterFirst.detailRows}, tras 2º=${anyExp.afterSecond?.detailRows}, tras colapsar=${anyExp.afterCollapse}; a 1440 oculto (adaptive)` : 'Botón "..." no visible en ningún viewport probado',
  evidence: [expEv, ...expResults.filter((r) => r.afterFirst).map((r) => `audit/screenshots/prueba-expander-${r.width}.png`)],
});
await page.setViewportSize({ width: 1440, height: 900 });
await go(page, 'PruebaExportacion.aspx');

// BT-06 accessible names
const p0 = snap2.rows[0].print!;
L(SC, 'BT-06', 'a.dxgv__cci Imprimir (img alt/title)', 'fail', {
  findingIds: ['PE-03'],
  reason: `Nombre accesible del enlace = alt de la imagen = '${p0.imgAlt}' (title='${p0.imgTitle}'); expander alt='${snap2.rows[0].expander?.imgAlt}'`,
  evidence: [snapEv],
});
// BT-07 feedback — buttons disabled, nothing happens
L(SC, 'BT-07', 'Imprimir (feedback tras clic)', 'executed-static', { reason: `Botones deshabilitados: sin feedback ni mensaje al hacer clic (posts=${clickResults.map((r) => r.posts.length).join(',')})`, evidence: [clickEv] });
// BT-11 tab order / focus
const stops = await tabTraverse(page, 40);
const stopsEv = saveEvidence('prueba-tab-order', stops);
console.log('tab stops', stops.map((x) => `${x?.tag}#${x?.id}[${x?.text}] fv=${x?.focusVisible} outline=${x?.outline}`).join('\n'));
L(SC, 'BT-11', 'PruebaExportacion.aspx (Tab)', 'executed-static', { reason: `${stops.length} paradas; iconos de fila alcanzables: ${stops.filter((x) => x && /DXCBtn/.test(x.id)).length}`, evidence: [stopsEv] });
// CC-01
L(SC, 'CC-01', 'PruebaExportacion.aspx', 'executed-static', { reason: `Título '${snap.pageTitle}'; cabeceras ${snap.headers.map((h) => h.text).filter(Boolean).join(' / ')}; fecha '${snap.rows[0].cells[2]}' (vs Estado '08-31-2026'); alt icono '${p0.imgAlt}'`, evidence: [snapEv] });
await s.close();
console.log('done');
