// Rastreo > Historial Guías modal: DR-01..DR-07, DR-09, DR-10, BT-01, BT-07, MD-08, TB-02, CC-02/CC-03.
// Filtro() clicks hidden submit #cpBody_bFiltro -> full postback to ./Rastreo.aspx (non-destructive search).
import fs from 'fs';
import { Page } from 'playwright';
import { startSession, go, shot, saveEvidence, saveText, logCase, serverErrorSignature, visibleText, onLogin } from '../../support/phase4.ts';

const G = 'rastreo';
const SCREEN = 'Rastreo > Historial Guías (modal)';
const INST = '#cpBody_lDesde/#cpBody_lHasta + Buscar (Filtro())';
const s = await startSession({ name: 'p4-rastreo-historial' });
const page = s.page;
// esbuild/tsx __name shim for nested arrow consts inside page.evaluate (see notes/phase4-nv11-four-contexts.md)
await s.context.addInitScript('window.__name = window.__name || (function(f){return f;});');
await page.evaluate('window.__name = window.__name || (function(f){return f;});');
if (!/Rastreo\.aspx/i.test(page.url())) await go(page, 'Rastreo.aspx');

// ---- request/response capture for Rastreo.aspx POSTs
type Rec = { url: string; method: string; status?: number; size?: number; ms?: number; startedAt: number; postFields?: Record<string, string> };
const recs: Rec[] = [];
page.on('request', (req) => {
  if (req.method() === 'POST' && /Rastreo\.aspx/i.test(req.url())) {
    const pd = req.postData() || '';
    const fields: Record<string, string> = {};
    for (const kv of pd.split('&')) {
      const [k, v = ''] = kv.split('=');
      const key = decodeURIComponent(k);
      if (/__VIEWSTATE|__EVENTVALIDATION|DXScript|DXCss|callbackState|DXVState/i.test(key)) { fields[key] = `<${v.length} chars>`; continue; }
      fields[key] = decodeURIComponent(v.replace(/\+/g, ' ')).slice(0, 200);
    }
    recs.push({ url: req.url(), method: req.method(), startedAt: Date.now(), postFields: fields });
  }
});
page.on('response', async (res) => {
  const req = res.request();
  if (req.method() === 'POST' && /Rastreo\.aspx/i.test(res.url())) {
    const r = recs.find((x) => x.startedAt && x.status === undefined && x.url === res.url());
    if (r) {
      r.status = res.status();
      r.ms = Date.now() - r.startedAt;
      try { r.size = (await res.body()).length; } catch { r.size = -1; }
    }
  }
});

async function openHistorial(p: Page) {
  // recover if the previous action left us on an error page / elsewhere
  const hasMenu = await p.locator('#cpBody_bpagar').count().catch(() => 0);
  if (!hasMenu || !/Rastreo\.aspx/i.test(p.url())) {
    console.log(`   (recovering: url=${p.url()} menuPresent=${hasMenu} -> reload Rastreo.aspx)`);
    await go(p, 'Rastreo.aspx');
    await p.waitForLoadState('networkidle').catch(() => {});
  }
  const modal = p.locator('#modal_Historial');
  if (await modal.evaluate((m) => m.classList.contains('show')).catch(() => false)) return;
  await p.click('#cpBody_bpagar');
  await p.waitForTimeout(300);
  await p.click('a[data-target="#modal_Historial"]');
  await p.waitForSelector('#modal_Historial.show', { timeout: 5000 });
  await p.waitForTimeout(400);
}
async function gridSnapshot(p: Page) {
  return p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#cpBody_gvDatos tr[id*="DXDataRow"], #cpBody_gvDatos tr[id*="DXGroupRow"], #cpBody_gvDatos tr[id*="DXEmptyRow"]')).map((r) => ({ id: r.id, text: (r as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 160) }));
    const modal = document.querySelector('#modal_Historial');
    const modalShown = !!modal && modal.classList.contains('show') && getComputedStyle(modal).display !== 'none';
    const desde = (document.getElementById('cpBody_lDesde') as HTMLInputElement | null)?.value;
    const hasta = (document.getElementById('cpBody_lHasta') as HTMLInputElement | null)?.value;
    const swal = document.querySelector('.swal2-container, .swal-overlay--show-modal, .swal-modal');
    const swalText = swal ? (swal as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : null;
    const alertLike = Array.from(document.querySelectorAll('.alert, .validation-summary-errors, [id*="Validator"], .text-danger, .invalid-feedback')).filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => (e as HTMLElement).innerText.trim()).filter(Boolean);
    return { rows, modalShown, desde, hasta, swalText, alertLike, bodyOverflow: getComputedStyle(document.body).overflow, url: location.href };
  });
}
const dialogs: string[] = [];
page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()}`); await d.dismiss().catch(() => {}); });

async function runFilter(p: Page, label: string, desde: string, hasta: string, opts: { doubleClick?: boolean } = {}) {
  await openHistorial(p);
  await p.evaluate(([d, h]) => {
    (document.getElementById('cpBody_lDesde') as HTMLInputElement).value = d;
    (document.getElementById('cpBody_lHasta') as HTMLInputElement).value = h;
  }, [desde, hasta]);
  const before = await gridSnapshot(p).catch(() => ({ rows: [], modalShown: false } as any));
  const nBefore = recs.length;
  const t0 = Date.now();
  const nav = p.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => `no-nav: ${e.message.split('\n')[0]}`);
  const buscar = p.locator('#modal_Historial a[onclick="Filtro()"]');
  if (opts.doubleClick) {
    await buscar.dblclick({ delay: 30 }).catch(async () => { await buscar.click(); await buscar.click().catch(() => {}); });
  } else {
    await buscar.click();
  }
  const navRes = await nav;
  await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(800);
  await p.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  const ms = Date.now() - t0;
  let html = '';
  for (let i = 0; i < 5 && !html; i++) { html = await p.content().catch(() => ''); if (!html) await p.waitForTimeout(700); }
  const err = serverErrorSignature(html);
  const after = err ? { rows: [], modalShown: false, desde: undefined, hasta: undefined, swalText: null, alertLike: [], bodyOverflow: '', url: p.url() } : await gridSnapshot(p).catch(() => ({ rows: [], modalShown: false, desde: undefined, hasta: undefined, swalText: null, alertLike: ['<snapshot failed>'], bodyOverflow: '', url: p.url() }));
  const text = await visibleText(p).catch(() => '');
  const reqs = recs.slice(nBefore);
  const out = { label, desde, hasta, before, after, ms, navRes: typeof navRes === 'string' ? navRes : 'navigated', reqs, serverError: err, onLogin: onLogin(p), dialogs: dialogs.splice(0), textSample: text.slice(0, 600), status: reqs.map((r) => r.status) };
  const ev = saveEvidence(`rastreo-historial-${label}`, out);
  const sc = await shot(p, `rastreo-historial-${label}`);
  console.log(`[${label}] desde=${desde} hasta=${hasta} ms=${ms} reqs=${reqs.length} status=${JSON.stringify(out.status)} modalAfter=${after.modalShown} rowsBefore=${before.rows.length} rowsAfter=${after.rows.length} err=${err} onLogin=${out.onLogin} nav=${out.navRes}`);
  console.log(`   rowsAfter: ${JSON.stringify(after.rows.map((r) => r.text)).slice(0, 500)}`);
  console.log(`   dates after: ${after.desde} / ${after.hasta}; swal=${after.swalText}; alerts=${JSON.stringify(after.alertLike)}; dialogs=${JSON.stringify(out.dialogs)}`);
  if (err) saveText(`rastreo-historial-${label}-response`, html, 'html');
  return { ...out, ev, sc };
}

// ---- Baseline: what does the page look like before any filter
const base = await gridSnapshot(page);
console.log('baseline rows', JSON.stringify(base.rows));

// ---- DR-10 / CC-02: stray "gv" literal
await openHistorial(page);
const gv = await page.evaluate(() => {
  const fg = document.getElementById('cpBody_lHasta')?.parentElement;
  const nodes = fg ? Array.from(fg.childNodes).map((n) => ({ type: n.nodeType, text: (n.textContent || '').trim(), tag: (n as Element).tagName })) : [];
  const modalText = (document.querySelector('#modal_Historial .modal-body') as HTMLElement)?.innerText.replace(/\s+/g, ' ').trim();
  return { nodes, modalText, fgHTML: fg?.outerHTML };
});
const gvPresent = gv.nodes.some((n) => n.type === 3 && n.text === 'gv');
console.log('DR-10 gv nodes', JSON.stringify(gv));
const gvShot = await shot(page, 'RA-01', false);
saveEvidence('RA-01-modal-dom', gv);
logCase({ group: G, screen: SCREEN, caseId: 'DR-10', instance: 'stray "gv" literal after #cpBody_lHasta', result: gvPresent ? 'fail' : 'pass', findingIds: gvPresent ? ['RA-01'] : [], reason: gvPresent ? 'text node "gv" rendered after Fecha Hasta input' : 'gv literal not present', evidence: [gvShot, 'audit/logs/evidence/RA-01-modal-dom.json'] });
logCase({ group: G, screen: SCREEN, caseId: 'CC-02', instance: 'stray "gv" literal', result: gvPresent ? 'fail' : 'pass', findingIds: gvPresent ? ['RA-01'] : [], evidence: [gvShot] });

// ---- DR-09: label association / keyboard on type=date
const lbl = await page.evaluate(() => {
  const info = (id: string) => {
    const el = document.getElementById(id) as HTMLInputElement;
    const labels = el.labels ? Array.from(el.labels).map((l) => l.textContent?.trim()) : [];
    const prev = el.previousElementSibling as HTMLElement | null;
    return { id, type: el.type, labels, ariaLabel: el.getAttribute('aria-label'), ariaLabelledby: el.getAttribute('aria-labelledby'), prevSiblingLabel: prev?.tagName === 'LABEL' ? { text: prev.textContent?.trim(), for: prev.getAttribute('for') } : null, required: el.required, min: el.min, max: el.max, tabIndex: el.tabIndex };
  };
  return [info('cpBody_lDesde'), info('cpBody_lHasta')];
});
console.log('DR-09', JSON.stringify(lbl));
// keyboard: focus Desde, type a date via keyboard segments, Tab to Hasta
await page.focus('#cpBody_lDesde');
await page.keyboard.type('01012026');
await page.keyboard.press('Tab');
const kb = await page.evaluate(() => ({ desde: (document.getElementById('cpBody_lDesde') as HTMLInputElement).value, active: (document.activeElement as HTMLElement)?.id || document.activeElement?.tagName }));
console.log('DR-09 keyboard', JSON.stringify(kb));
saveEvidence('rastreo-DR-09-labels', { lbl, kb });
const labelsMissing = lbl.every((l) => l.labels.length === 0 && !l.ariaLabel && !l.ariaLabelledby);
logCase({ group: G, screen: SCREEN, caseId: 'DR-09', instance: INST, result: labelsMissing ? 'fail' : 'pass', findingIds: labelsMissing ? ['RA-02'] : [], reason: `labels=${JSON.stringify(lbl.map((l) => l.labels))} keyboard typed value=${kb.desde} next focus=${kb.active}`, evidence: ['audit/logs/evidence/rastreo-DR-09-labels.json'] });
// reset
await page.evaluate(() => { (document.getElementById('cpBody_lDesde') as HTMLInputElement).value = ''; });

// ---- DR-03: both empty
const dr03 = await runFilter(page, 'DR-03-empty', '', '');
logCase({ group: G, screen: SCREEN, caseId: 'DR-03', instance: INST, result: dr03.serverError || dr03.onLogin ? 'fail' : 'pass', reason: `status=${JSON.stringify(dr03.status)} ${dr03.ms}ms rowsAfter=${dr03.after.rows.length} modalAfter=${dr03.after.modalShown}`, evidence: [dr03.ev, dr03.sc] });

// ---- DR-05: same day (the known record date 2026-09-02)
const dr05 = await runFilter(page, 'DR-05-sameday', '2026-09-02', '2026-09-02');
logCase({ group: G, screen: SCREEN, caseId: 'DR-05', instance: INST, result: dr05.serverError || dr05.onLogin ? 'fail' : 'pass', reason: `rowsAfter=${dr05.after.rows.length} ${dr05.ms}ms`, evidence: [dr05.ev, dr05.sc] });

// ---- wide valid range (control): 2025-01-01..2026-12-31
const ctl = await runFilter(page, 'control-wide', '2025-01-01', '2026-12-31');
logCase({ group: G, screen: SCREEN, caseId: 'MD-08', instance: '#modal_Historial Buscar → result rendering', result: ctl.serverError ? 'fail' : 'pass', reason: `after Buscar: modalShown=${ctl.after.modalShown} rows=${ctl.after.rows.length} nav=${ctl.navRes}`, evidence: [ctl.ev, ctl.sc] });

// ---- DR-01: inverted range
const dr01 = await runFilter(page, 'DR-01-inverted', '2026-06-01', '2026-01-01');
logCase({ group: G, screen: SCREEN, caseId: 'DR-01', instance: INST, result: dr01.serverError || dr01.onLogin ? 'fail' : 'pass', reason: `rowsAfter=${dr01.after.rows.length} alerts=${JSON.stringify(dr01.after.alertLike)} swal=${dr01.after.swalText} dialogs=${JSON.stringify(dr01.dialogs)}`, evidence: [dr01.ev, dr01.sc] });

// ---- DR-02: absurd range
const dr02 = await runFilter(page, 'DR-02-absurd', '1900-01-01', '2999-12-31');
logCase({ group: G, screen: SCREEN, caseId: 'DR-02', instance: INST, result: dr02.serverError || dr02.onLogin || dr02.ms > 20000 ? 'fail' : 'pass', reason: `status=${JSON.stringify(dr02.status)} ${dr02.ms}ms size=${JSON.stringify(dr02.reqs.map((r) => r.size))} rowsAfter=${dr02.after.rows.length}`, evidence: [dr02.ev, dr02.sc] });

// ---- DR-04: only Desde / only Hasta
const dr04a = await runFilter(page, 'DR-04-onlyDesde', '2026-01-01', '');
const dr04b = await runFilter(page, 'DR-04-onlyHasta', '', '2026-12-31');
logCase({ group: G, screen: SCREEN, caseId: 'DR-04', instance: INST, result: dr04a.serverError || dr04b.serverError || dr04a.onLogin || dr04b.onLogin ? 'fail' : 'pass', reason: `onlyDesde rows=${dr04a.after.rows.length} status=${JSON.stringify(dr04a.status)}; onlyHasta rows=${dr04b.after.rows.length} status=${JSON.stringify(dr04b.status)}`, evidence: [dr04a.ev, dr04a.sc, dr04b.ev, dr04b.sc] });

// ---- DR-06 / TB-02: future-only range
const dr06 = await runFilter(page, 'DR-06-future', '2030-01-01', '2030-12-31');
logCase({ group: G, screen: SCREEN, caseId: 'DR-06', instance: INST, result: dr06.serverError ? 'fail' : 'pass', reason: `rowsAfter=${JSON.stringify(dr06.after.rows.map((r) => r.text)).slice(0, 200)} text sample: ${dr06.textSample.slice(0, 200)}`, evidence: [dr06.ev, dr06.sc] });
logCase({ group: G, screen: SCREEN, caseId: 'TB-02', instance: '#cpBody_gvDatos after Historial filter matching nothing', result: 'executed-static', reason: `see DR-06 evidence: rows after empty filter = ${dr06.after.rows.length}`, evidence: [dr06.ev, dr06.sc] });

// ---- DR-07: invalid date (a) browser-level: set 2026-02-30 via value (browser sanitizes), via keyboard typing
await openHistorial(page);
const inv = await page.evaluate(() => {
  const d = document.getElementById('cpBody_lDesde') as HTMLInputElement;
  d.value = '2026-02-30';
  const afterSet = d.value;
  d.value = 'garbage';
  const afterGarbage = d.value;
  d.value = '';
  return { afterSet, afterGarbage, validity: d.validity.valid, badInput: d.validity.badInput };
});
await page.focus('#cpBody_lDesde');
await page.keyboard.type('30022026');
const typed = await page.evaluate(() => { const d = document.getElementById('cpBody_lDesde') as HTMLInputElement; return { value: d.value, badInput: d.validity.badInput, valid: d.validity.valid }; });
console.log('DR-07 browser-level', JSON.stringify({ inv, typed }));
await page.evaluate(() => { (document.getElementById('cpBody_lDesde') as HTMLInputElement).value = ''; });
// (b) server-level: submit with an impossible date by rewriting the POST body once (validation probe)
let rewrote = false;
await page.route('**/Rastreo.aspx', async (route) => {
  const req = route.request();
  if (req.method() === 'POST' && !rewrote) {
    const pd = req.postData() || '';
    const npd = pd.replace(/(ctl00%24cpBody%24lDesde=)[^&]*/, '$12026-02-30').replace(/(ctl00%24cpBody%24lHasta=)[^&]*/, '$12026-13-45');
    rewrote = npd !== pd;
    await route.continue({ postData: npd });
  } else await route.continue();
});
const dr07 = await runFilter(page, 'DR-07-impossible-server', '2026-02-01', '2026-02-02');
await page.unroute('**/Rastreo.aspx');
saveEvidence('rastreo-historial-DR-07-browser', { inv, typed, rewrote });
logCase({ group: G, screen: SCREEN, caseId: 'DR-07', instance: INST, result: dr07.serverError ? 'fail' : 'pass', findingIds: dr07.serverError ? ['RA-03'] : [], reason: `browser sanitized 2026-02-30→"${inv.afterSet}", typed 30/02→"${typed.value}"; server POST with lDesde=2026-02-30 lHasta=2026-13-45 rewrote=${rewrote} status=${JSON.stringify(dr07.status)} err=${dr07.serverError} rows=${dr07.after.rows.length}`, evidence: [dr07.ev, dr07.sc, 'audit/logs/evidence/rastreo-historial-DR-07-browser.json'] });

// ---- BT-01: double-click Buscar
const bt01 = await runFilter(page, 'BT-01-dblclick', '2026-01-01', '2026-12-31', { doubleClick: true });
logCase({ group: G, screen: SCREEN, caseId: 'BT-01', instance: 'Buscar (Filtro())', result: bt01.reqs.length > 1 ? 'fail' : 'pass', findingIds: bt01.reqs.length > 1 ? ['RA-04'] : [], reason: `POSTs fired by double-click: ${bt01.reqs.length} status=${JSON.stringify(bt01.status)} err=${bt01.serverError}`, evidence: [bt01.ev, bt01.sc] });

// ---- BT-07: feedback after click (is there a spinner / disabled state?)
await openHistorial(page);
await openHistorial(page); // second call is a no-op if the modal is already open (guards recovery reload)
await page.evaluate(() => { (document.getElementById('cpBody_lDesde') as HTMLInputElement).value = '2026-01-01'; (document.getElementById('cpBody_lHasta') as HTMLInputElement).value = '2026-12-31'; });
const feedbackSamples: string[] = [];
const navP = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
await page.click('#modal_Historial a[onclick="Filtro()"]');
for (let i = 0; i < 6; i++) {
  const f = await page.evaluate(() => {
    const b = document.querySelector('#modal_Historial a[onclick="Filtro()"]') as HTMLElement | null;
    const spinners = Array.from(document.querySelectorAll('.spinner, .loading, .dxlpLoadingPanel_Office365, [id$="_LP"], .swal2-container, .swal-overlay')).filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.id || e.className);
    return `t=${performance.now().toFixed(0)} btnClass=${b?.className} disabled=${b?.getAttribute('disabled')} ariaBusy=${document.body.getAttribute('aria-busy')} cursor=${getComputedStyle(document.body).cursor} title=${document.title} visibleSpinners=${JSON.stringify(spinners)}`;
  }).catch((e) => `navigating: ${String(e.message).split('\n')[0]}`);
  feedbackSamples.push(f);
  await page.waitForTimeout(150);
}
await navP;
await page.waitForLoadState('networkidle').catch(() => {});
console.log('BT-07 samples', feedbackSamples.join('\n'));
saveEvidence('rastreo-BT-07-feedback', feedbackSamples);
logCase({ group: G, screen: SCREEN, caseId: 'BT-07', instance: 'Buscar (Filtro())', result: 'executed-static', reason: 'no client-side disabled/spinner state on Buscar; full postback only (see samples)', evidence: ['audit/logs/evidence/rastreo-BT-07-feedback.json'] });

// ---- CC-03: collect messages
const allMsgs = { dr01: dr01.after.alertLike, dr03: dr03.after.alertLike, dr06text: dr06.textSample, dr06rows: dr06.after.rows, dialogs: dialogs };
saveEvidence('rastreo-CC-03-messages', allMsgs);
logCase({ group: G, screen: SCREEN, caseId: 'CC-03', instance: 'Historial validation/empty messages', result: 'executed-static', reason: 'messages collected in evidence', evidence: ['audit/logs/evidence/rastreo-CC-03-messages.json'] });

saveEvidence('rastreo-historial-all-requests', recs);
await s.close();
console.log('done');
