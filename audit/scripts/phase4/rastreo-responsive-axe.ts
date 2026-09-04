// Rastreo responsive + accessibility + copy: RS-01..RS-04, TB-07, MD-06 (375/768/1440), AX-01/02/04/05, CC-01.
import { Page } from 'playwright';
import { startSession, go, shot, saveEvidence, logCase, runAxe } from '../../support/phase4.ts';

const G = 'rastreo';
const SC = 'Rastreo';
const s = await startSession({ name: 'p4-rastreo-responsive' });
const page = s.page;
await s.context.addInitScript('window.__name = window.__name || (function(f){return f;});');
await page.evaluate('window.__name = window.__name || (function(f){return f;});');

const metrics = (p: Page) => p.evaluate(() => {
  const de = document.documentElement;
  const grid = document.getElementById('cpBody_gvDatos');
  const gp = grid?.parentElement as HTMLElement | null;
  const overflowAncestor = (() => { let e: HTMLElement | null = grid as HTMLElement | null; while (e && e !== document.body) { const o = getComputedStyle(e).overflowX; if (o === 'auto' || o === 'scroll') return { tag: e.tagName, id: e.id, cls: e.className.toString().slice(0, 50), scrollW: e.scrollWidth, clientW: e.clientWidth }; e = e.parentElement; } return null; })();
  const visHeaders = Array.from(document.querySelectorAll('#cpBody_gvDatos td[id^="cpBody_gvDatos_col"]')).filter((h) => (h as HTMLElement).offsetParent !== null).map((h) => (h as HTMLElement).innerText.trim());
  const sidebar = document.querySelector('.app-sidebar') as HTMLElement | null;
  const toggle = document.querySelector('.mobile-toggle-nav, .hamburger') as HTMLElement | null;
  const menuBtn = document.getElementById('cpBody_bpagar') as HTMLElement | null;
  const r = (e: HTMLElement | null) => e ? (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }))(e.getBoundingClientRect()) : null;
  const small = Array.from(document.querySelectorAll('a,button,input,[onclick]')).filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => ({ el: `${e.tagName}#${e.id}|${((e as HTMLElement).innerText || (e as HTMLElement).title || '').trim().slice(0, 20)}`, ...r(e as HTMLElement) })).filter((b) => b.width! < 24 || b.height! < 24);
  return { vw: innerWidth, vh: innerHeight, scrollW: de.scrollWidth, clientW: de.clientWidth, hOverflow: de.scrollWidth > de.clientWidth, bodyScrollW: document.body.scrollWidth, gridW: grid ? (grid as HTMLElement).getBoundingClientRect().width : null, gridRight: grid ? Math.round((grid as HTMLElement).getBoundingClientRect().right) : null, gridParentOverflowX: gp ? getComputedStyle(gp).overflowX : null, overflowAncestor, visHeaders, sidebarRect: r(sidebar), sidebarVisible: sidebar ? sidebar.getBoundingClientRect().right > 0 && getComputedStyle(sidebar).visibility !== 'hidden' : null, toggleVisible: toggle ? toggle.offsetParent !== null : null, menuBtnRect: r(menuBtn), smallTargets: small.slice(0, 12), smallCount: small.length, widestEl: (() => { let w = 0, who = ''; document.querySelectorAll('body *').forEach((e) => { const rr = e.getBoundingClientRect(); if (rr.right > w) { w = rr.right; who = `${e.tagName}#${e.id}.${e.className.toString().slice(0, 30)}`; } }); return { right: Math.round(w), who }; })() };
});
const modalMetrics = (p: Page) => p.evaluate(() => {
  const m = document.querySelector('#modal_Historial') as HTMLElement;
  const dlg = m.querySelector('.modal-dialog') as HTMLElement; const content = m.querySelector('.modal-content') as HTMLElement; const header = document.querySelector('.app-header') as HTMLElement | null; const title = m.querySelector('.modal-header') as HTMLElement;
  const r = (e: HTMLElement | null) => e ? (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }))(e.getBoundingClientRect()) : null;
  return { vw: innerWidth, vh: innerHeight, dialog: r(dlg), content: r(content), header: r(header), modalHeader: r(title), fitsViewport: dlg.getBoundingClientRect().right <= innerWidth + 1 && dlg.getBoundingClientRect().left >= -1, titleUnderHeader: !!header && title.getBoundingClientRect().top < header.getBoundingClientRect().bottom, titleCovered: (() => { const rr = title.getBoundingClientRect(); const el = document.elementFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2); return el ? `${el.tagName}.${el.className.toString().slice(0, 40)} inModal=${!!el.closest('#modal_Historial')}` : null; })(), modalZ: getComputedStyle(m).zIndex, headerZ: header ? getComputedStyle(header).zIndex : null, headerPos: header ? getComputedStyle(header).position : null, hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, modalScrollW: m.scrollWidth, modalClientW: m.clientWidth, buscarRect: r(m.querySelector('a[onclick="Filtro()"]') as HTMLElement), inputW: (m.querySelector('#cpBody_lDesde') as HTMLElement).getBoundingClientRect().width };
});

const results: any = {};
for (const w of [375, 768, 1440]) {
  const vp = { width: w, height: w === 375 ? 812 : w === 768 ? 1024 : 900 };
  await page.setViewportSize(vp);
  await go(page, 'Rastreo.aspx');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(600);
  const r: any = {};
  try {
    r.page = await metrics(page);
    r.shot = await shot(page, `rs-rastreo-${w}`);
    // grid at this width: expand adaptive detail to see hidden columns
    const adsb = page.locator('#cpBody_gvDatos a.dxgvADSB').first();
    if (await adsb.count()) { await adsb.click().catch(() => {}); await page.waitForTimeout(600); r.detailText = await page.locator('#cpBody_gvDatos tr[id*="DXADRow"]').last().innerText().catch(() => null); r.detailShot = await shot(page, `rs-rastreo-${w}-detail`); await adsb.click().catch(() => {}); await page.waitForTimeout(300); }
    // Historial modal
    await page.click('#cpBody_bpagar'); await page.waitForTimeout(300);
    await page.click('a[data-target="#modal_Historial"]'); await page.waitForSelector('#modal_Historial.show'); await page.waitForTimeout(500);
    r.modal = await modalMetrics(page);
    r.modalShot = await shot(page, `rs-rastreo-historial-${w}`, false);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    r.escClosedModal = (await page.locator('#modal_Historial.show').count()) === 0;
    if (!r.escClosedModal) { await page.mouse.click(5, vp.height - 40); await page.waitForTimeout(600); } // backdrop click (Esc only works with focus inside the modal — RA-13)
    r.modalClosedBeforePopup = (await page.locator('#modal_Historial.show').count()) === 0;
    // Movimientos popup at this width
    const nav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await page.click('a[onclick*="VerGuia"]'); await nav; await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800);
    r.popup = await page.evaluate(() => { const wnd = document.getElementById('cpBody_ppCambioGuia_PW-1') as HTMLElement | null; if (!wnd) return null; const rr = wnd.getBoundingClientRect(); return { x: Math.round(rr.x), y: Math.round(rr.y), width: Math.round(rr.width), height: Math.round(rr.height), vw: innerWidth, vh: innerHeight, fits: rr.right <= innerWidth + 1 && rr.left >= -1 && rr.bottom <= innerHeight + 1, shown: getComputedStyle(wnd).display !== 'none', closeBtn: (() => { const c = document.getElementById('cpBody_ppCambioGuia_HCB-1'); if (!c) return null; const cr = c.getBoundingClientRect(); return { x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height), inViewport: cr.right <= innerWidth && cr.left >= 0 && cr.top >= 0 }; })(), hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }; });
    r.popupShot = await shot(page, `rs-rastreo-movimientos-${w}`, false);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    // axe at this width (page with popup closed)
    r.axe = await runAxe(page, `rastreo-${w}`);
  } catch (e: any) { r.error = e.message.split('\n')[0]; }
  results[w] = r;
  console.log(`--- ${w}px`, JSON.stringify({ page: r.page && { hOverflow: r.page.hOverflow, scrollW: r.page.scrollW, clientW: r.page.clientW, gridRight: r.page.gridRight, overflowAncestor: r.page.overflowAncestor, visHeaders: r.page.visHeaders, sidebarVisible: r.page.sidebarVisible, toggleVisible: r.page.toggleVisible, widest: r.page.widestEl, smallCount: r.page.smallCount }, detailText: r.detailText, modal: r.modal, popup: r.popup, axe: r.axe && { count: r.axe.count, v: r.axe.violations.map((v: any) => `${v.id}(${v.impact},${v.nodes})`) }, error: r.error }, null, 1));
}
saveEvidence('rastreo-responsive', results);

// ---- RS-01/02/03
for (const [w, cid] of [[375, 'RS-01'], [768, 'RS-02'], [1440, 'RS-03']] as const) {
  const r = results[w];
  const fail = r.error || r.page?.hOverflow;
  logCase({ group: G, screen: SC, caseId: cid, instance: `Rastreo @${w}`, result: fail ? 'fail' : 'pass', findingIds: r.page?.hOverflow ? ['RA-17'] : [], reason: `hOverflow=${r.page?.hOverflow} (scrollW=${r.page?.scrollW} clientW=${r.page?.clientW} widest=${JSON.stringify(r.page?.widestEl)}); sidebarVisible=${r.page?.sidebarVisible} toggleVisible=${r.page?.toggleVisible}; visible cols=${JSON.stringify(r.page?.visHeaders)}; small targets(<24px)=${r.page?.smallCount} err=${r.error}`, evidence: [`audit/screenshots/rs-rastreo-${w}.png`, 'audit/logs/evidence/rastreo-responsive.json'] });
}
// ---- TB-07 / RS-04 grids
for (const w of [375, 768]) {
  const r = results[w];
  logCase({ group: G, screen: SC, caseId: 'TB-07', instance: `#cpBody_gvDatos @${w}`, result: r.page ? (r.page.hOverflow ? 'fail' : 'pass') : 'omitted', findingIds: r.page?.hOverflow ? ['RA-17'] : [], reason: `grid right edge=${r.page?.gridRight} vw=${w}; overflow container=${JSON.stringify(r.page?.overflowAncestor)}; adaptive hidden cols shown in detail: "${r.detailText}"`, evidence: [`audit/screenshots/rs-rastreo-${w}.png`, `audit/screenshots/rs-rastreo-${w}-detail.png`] });
  logCase({ group: G, screen: SC, caseId: 'RS-04', instance: `grid + #modal_Historial (modal-full) + Movimientos popup @${w}`, result: r.modal ? (r.modal.fitsViewport && !r.modal.hOverflow && r.popup?.fits ? 'pass' : 'fail') : 'omitted', findingIds: r.modal && (!r.modal.fitsViewport || !r.popup?.fits) ? ['RA-18'] : [], reason: `modal dialog=${JSON.stringify(r.modal?.dialog)} fits=${r.modal?.fitsViewport} hOverflow=${r.modal?.hOverflow}; popup=${JSON.stringify(r.popup)}`, evidence: [`audit/screenshots/rs-rastreo-historial-${w}.png`, `audit/screenshots/rs-rastreo-movimientos-${w}.png`] });
}
// ---- MD-06 at each width
for (const w of [375, 768, 1440]) {
  const r = results[w];
  logCase({ group: G, screen: 'Rastreo > Historial Guías (modal)', caseId: 'MD-06', instance: `#modal_Historial @${w}`, result: r.modal ? (r.modal.titleUnderHeader ? 'fail' : 'pass') : 'omitted', findingIds: r.modal?.titleUnderHeader ? ['RA-12'] : [], reason: `modal header rect=${JSON.stringify(r.modal?.modalHeader)} app header rect=${JSON.stringify(r.modal?.header)} titleUnderHeader=${r.modal?.titleUnderHeader} elementAtTitleCenter=${r.modal?.titleCovered} modalZ=${r.modal?.modalZ} headerZ=${r.modal?.headerZ}/${r.modal?.headerPos}`, evidence: [`audit/screenshots/rs-rastreo-historial-${w}.png`] });
}
// ---- AX-01 (1440 main), AX-05 contrast, AX-02 labels
const ax = results[1440].axe;
logCase({ group: G, screen: SC, caseId: 'AX-01', instance: 'Rastreo.aspx @1440 (also 375/768 in evidence)', result: ax ? 'executed-static' : 'omitted', findingIds: ax && ax.count ? ['RA-19'] : [], reason: ax ? `${ax.count} violation types: ${ax.violations.map((v: any) => `${v.id}(${v.impact},${v.nodes})`).join(', ')}` : results[1440].error, evidence: ax ? [ax.file, results[375].axe?.file, results[768].axe?.file].filter(Boolean) : [] });
const contrast = ax?.violations.find((v: any) => v.id === 'color-contrast');
logCase({ group: G, screen: SC, caseId: 'AX-05', instance: 'Rastreo text/controls contrast (axe color-contrast)', result: contrast ? 'fail' : 'pass', findingIds: contrast ? ['RA-19'] : [], reason: contrast ? `color-contrast: ${contrast.nodes} nodes, sample ${JSON.stringify(contrast.sample)}` : 'no color-contrast violations reported by axe', evidence: ax ? [ax.file] : [] });
logCase({ group: G, screen: SC, caseId: 'AX-02', instance: 'Historial date fields label association', result: 'fail', findingIds: ['RA-02'], reason: 'Rastreo has no placeholder-labeled fields; the two date inputs have adjacent <label> without for/id association (see DR-09)', evidence: ['audit/logs/evidence/rastreo-DR-09-labels.json'] });
logCase({ group: G, screen: SC, caseId: 'AX-04', instance: 'Rastreo page keyboard traversal', result: 'fail', findingIds: ['RA-05', 'RA-08'], reason: 'Tab path recorded in TB-05 evidence: sidebar → Menu → DXCBtn0 → Adjuntos link → tracking link → DXCBtn1 → footer; group toggle not reachable; no visible focus ring on grid links (BT-11)', evidence: ['audit/logs/evidence/rastreo-TB-05-groups.json', 'audit/logs/evidence/rastreo-BT-11-focus.json'] });
logCase({ group: G, screen: SC, caseId: 'RS-05', instance: 'mobile nav toggle', result: 'omitted', reason: 'shared chrome, owned by micuenta group (SH- prefix)' });

// ---- CC-01 copy review: collect visible strings on Rastreo + modals + Adjuntos
await page.setViewportSize({ width: 1440, height: 900 });
await go(page, 'Rastreo.aspx'); await page.waitForLoadState('networkidle').catch(() => {});
const copy = await page.evaluate(() => {
  const t = (sel: string) => Array.from(document.querySelectorAll(sel)).map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return { pageTitle: document.title, heading: t('.page-title-heading'), subheading: t('.page-title-subheading'), menu: t('#cpBody_bpagar, #cpBody_ulFormaPagos'), headers: t('#cpBody_gvDatos td[id^="cpBody_gvDatos_col"]'), group: t('#cpBody_gvDatos tr[id*="DXGroupRow"]'), tooltips: Array.from(document.querySelectorAll('#cpBody_gvDatos [title]')).map((e) => e.getAttribute('title')), modalTexts: t('#modal_Historial .modal-title, #modal_Historial legend, #modal_Historial label, #modal_Historial a'), popupHeader: (document.getElementById('cpBody_ppCambioGuia_PWH-1T') as HTMLElement | null)?.innerText, popupHeaders: t('#cpBody_ppCambioGuia_gvDetalles td[id*="_col"]'), popupEmpty: t('#cpBody_ppCambioGuia_gvDetalles_DXEmptyRow'), loading: t('#cpBody_gvDatos_LP, #cpBody_gvDatos_TL'), emptyRowTemplate: (document.getElementById('cpBody_gvDatos_DXEmptyRow') as HTMLElement | null)?.innerText, lang: document.documentElement.lang, footer: t('.app-footer, footer') };
});
console.log('CC-01', JSON.stringify(copy, null, 1));
saveEvidence('rastreo-CC-01-copy', copy);
logCase({ group: G, screen: SC, caseId: 'CC-01', instance: 'Rastreo + modals visible copy', result: 'fail', findingIds: ['RA-11'], reason: `subheading "${copy.subheading}", modal title "${copy.modalTexts?.[0]}", headers ${JSON.stringify(copy.headers)}, English DevExpress strings ("No data to display", "Loading…"), lang=${copy.lang}`, evidence: ['audit/logs/evidence/rastreo-CC-01-copy.json'] });

await s.close();
console.log('done');
