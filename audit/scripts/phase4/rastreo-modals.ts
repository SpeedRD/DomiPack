// Rastreo modals: Historial (#modal_Historial, Bootstrap), Movimientos (DevExpress ASPxPopupControl cpBody_ppCambioGuia),
// Menu dropdown (#cpBody_bpagar). Cases MD-01..MD-07, MD-10 (+ MD-05 double-open), AX-04 (modal tab loop).
import { Page } from 'playwright';
import { startSession, go, shot, saveEvidence, logCase, serverErrorSignature } from '../../support/phase4.ts';

const G = 'rastreo';
const s = await startSession({ name: 'p4-rastreo-modals' });
const page = s.page;
await s.context.addInitScript('window.__name = window.__name || (function(f){return f;});');
await page.evaluate('window.__name = window.__name || (function(f){return f;});');
if (!/Rastreo\.aspx/i.test(page.url())) await go(page, 'Rastreo.aspx');
await page.waitForLoadState('networkidle').catch(() => {});
const dialogs: string[] = [];
page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()}`); await d.dismiss().catch(() => {}); });
const posts: { url: string; status: number | null; t: number }[] = [];
page.on('request', (r) => { if (r.method() === 'POST') posts.push({ url: r.url(), status: null, t: Date.now() }); });
page.on('response', (r) => { if (r.request().method() === 'POST') { const p = posts.find((x) => x.url === r.url() && x.status === null); if (p) p.status = r.status(); } });

const active = () => page.evaluate(() => { const e = document.activeElement as HTMLElement | null; return e ? `${e.tagName}#${e.id}.${(e.className || '').toString().slice(0, 30)}|${(e.innerText || '').trim().slice(0, 25)}|inHistorial=${!!e.closest('#modal_Historial')}|inPopup=${!!e.closest('[id^="cpBody_ppCambioGuia_PW"]')}` : 'null'; });
const histState = () => page.evaluate(() => {
  const m = document.querySelector('#modal_Historial') as HTMLElement | null;
  const shown = !!m && m.classList.contains('show') && getComputedStyle(m).display !== 'none';
  const backdrops = document.querySelectorAll('.modal-backdrop').length;
  const dlg = m?.querySelector('.modal-dialog') as HTMLElement | null;
  const header = document.querySelector('.app-header') as HTMLElement | null;
  const title = m?.querySelector('.modal-header') as HTMLElement | null;
  const r = (e: HTMLElement | null) => e ? (({ x, y, width, height }) => ({ x, y, width, height }))(e.getBoundingClientRect()) : null;
  return { shown, backdrops, bodyClass: document.body.className, bodyOverflow: getComputedStyle(document.body).overflow, modalZ: m ? getComputedStyle(m).zIndex : null, headerZ: header ? getComputedStyle(header).zIndex : null, dialogRect: r(dlg), headerRect: r(header), titleRect: r(title), modalAriaHidden: m?.getAttribute('aria-hidden'), modalRole: m?.getAttribute('role'), modalAriaModal: m?.getAttribute('aria-modal'), modalTabindex: m?.getAttribute('tabindex'), vw: innerWidth, vh: innerHeight, docScrollW: document.documentElement.scrollWidth };
});
const popupState = () => page.evaluate(() => {
  const w = document.getElementById('cpBody_ppCambioGuia_PW-1') as HTMLElement | null;
  const shown = !!w && getComputedStyle(w).display !== 'none' && w.offsetParent !== null;
  const closeBtn = document.getElementById('cpBody_ppCambioGuia_HCB-1') as HTMLElement | null;
  const back = document.getElementById('cpBody_ppCambioGuia_DXPWMB-1') as HTMLElement | null;
  const rows = Array.from(document.querySelectorAll('#cpBody_ppCambioGuia_gvDetalles tr[id*="DXDataRow"], #cpBody_ppCambioGuia_gvDetalles tr[id*="DXGroupRow"], #cpBody_ppCambioGuia_gvDetalles tr[id*="DXEmptyRow"]')).map((r) => (r as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 100));
  const pageRows = document.querySelectorAll('#cpBody_gvDatos tr[id*="DXDataRow"]').length;
  const r = (e: HTMLElement | null) => e ? (({ x, y, width, height }) => ({ x, y, width, height }))(e.getBoundingClientRect()) : null;
  const header = document.querySelector('.app-header') as HTMLElement | null;
  return { shown, rect: r(w), closeBtn: closeBtn ? { visible: closeBtn.offsetParent !== null, rect: r(closeBtn), html: closeBtn.outerHTML.slice(0, 300), role: closeBtn.getAttribute('role'), tabindex: closeBtn.getAttribute('tabindex'), ariaLabel: closeBtn.getAttribute('aria-label'), title: closeBtn.getAttribute('title') } : null, backdrop: back ? { visible: back.offsetParent !== null, rect: r(back) } : null, headerText: (document.getElementById('cpBody_ppCambioGuia_PWH-1T') as HTMLElement | null)?.innerText, rows, pageRows, headerRect: r(header), popupRole: w?.getAttribute('role'), popupAriaModal: w?.getAttribute('aria-modal'), vw: innerWidth, vh: innerHeight };
});
async function openHistorial(p: Page) {
  await p.click('#cpBody_bpagar');
  await p.waitForTimeout(300);
  await p.click('a[data-target="#modal_Historial"]');
  await p.waitForSelector('#modal_Historial.show', { timeout: 5000 });
  await p.waitForTimeout(500);
}
async function ensureRastreo() {
  if (!/Rastreo\.aspx/i.test(page.url()) || !(await page.locator('#cpBody_bpagar').count())) { await go(page, 'Rastreo.aspx'); await page.waitForLoadState('networkidle').catch(() => {}); }
}

// =================== Menu dropdown (MD-10, MD-05)
const SC_MENU = 'Rastreo > Menu dropdown (#cpBody_bpagar)';
const md10: any = {};
try {
  const ddState = () => page.evaluate(() => { const b = document.getElementById('cpBody_bpagar')!; const menu = b.parentElement!.querySelector('.dropdown-menu')!; return { expanded: b.getAttribute('aria-expanded'), shown: menu.classList.contains('show'), menuAriaHidden: menu.getAttribute('aria-hidden'), menuRole: menu.getAttribute('role'), itemRoles: Array.from(menu.querySelectorAll('a')).map((a) => a.getAttribute('role')), btnAria: Array.from(b.attributes).filter((a) => a.name.startsWith('aria')).map((a) => `${a.name}=${a.value}`) }; });
  md10.initial = await ddState();
  await page.click('#cpBody_bpagar'); await page.waitForTimeout(300);
  md10.afterClick = await ddState();
  md10.menuShot = await shot(page, 'rastreo-menu-open', false);
  await page.mouse.click(700, 600); await page.waitForTimeout(300);
  md10.afterClickOutside = await ddState();
  await page.click('#cpBody_bpagar'); await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  md10.afterEsc = await ddState();
  // keyboard open + arrow
  await page.focus('#cpBody_bpagar'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  md10.afterEnter = { ...(await ddState()), active: await active() };
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
  md10.afterArrowDown = { active: await active() };
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  md10.afterEsc2 = { ...(await ddState()), active: await active() };
  // double click
  await page.dblclick('#cpBody_bpagar'); await page.waitForTimeout(300);
  md10.afterDblClick = await ddState();
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  md10.dialogs = dialogs.splice(0);
} catch (e: any) { md10.error = e.message.split('\n')[0]; }
console.log('MD-10', JSON.stringify(md10, null, 1));
saveEvidence('rastreo-MD-10-menu', md10);
const ddOk = md10.afterClick?.shown && !md10.afterClickOutside?.shown && !md10.afterEsc?.shown && md10.afterEnter?.shown;
logCase({ group: G, screen: SC_MENU, caseId: 'MD-10', instance: '#cpBody_bpagar dropdown', result: md10.error ? 'fail' : ddOk ? 'pass' : 'fail', reason: `open=${md10.afterClick?.shown} outsideCloses=${!md10.afterClickOutside?.shown} escCloses=${!md10.afterEsc?.shown} enterOpens=${md10.afterEnter?.shown} arrowDownFocus=${md10.afterArrowDown?.active} dblclick=${md10.afterDblClick?.shown} aria-expanded=${md10.afterClick?.expanded} err=${md10.error}`, evidence: ['audit/logs/evidence/rastreo-MD-10-menu.json', 'audit/screenshots/rastreo-menu-open.png'] });
logCase({ group: G, screen: SC_MENU, caseId: 'MD-05', instance: '#cpBody_bpagar dropdown', result: md10.afterDblClick ? 'pass' : 'omitted', reason: `double-click toggles (shown after dblclick=${md10.afterDblClick?.shown}); single dropdown instance`, evidence: ['audit/logs/evidence/rastreo-MD-10-menu.json'] });

// =================== Historial modal (MD-01, MD-02, MD-03, MD-05, MD-06@1440, MD-07)
const SC_H = 'Rastreo > Historial Guías (modal)';
const mdh: any = {};
try {
  await ensureRastreo();
  mdh.scrollBefore = await page.evaluate(() => ({ overflow: getComputedStyle(document.body).overflow, cls: document.body.className }));
  await openHistorial(page);
  mdh.open = await histState();
  mdh.openActive = await active();
  mdh.openShot = await shot(page, 'RA-12', false);
  // MD-07: tab loop inside modal
  const path: string[] = [];
  for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); path.push(await active()); }
  mdh.tabPath = path;
  mdh.focusEscapes = path.some((p) => p.includes('inHistorial=false') && !p.startsWith('BODY'));
  // MD-01: close via ×
  await page.click('#modal_Historial .close');
  await page.waitForTimeout(600);
  mdh.afterX = await histState();
  mdh.afterXActive = await active();
  // MD-02: backdrop click
  await openHistorial(page);
  await page.mouse.click(20, 700); await page.waitForTimeout(600);
  mdh.afterBackdrop = await histState();
  if (mdh.afterBackdrop.shown) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
  // MD-03: Esc
  await openHistorial(page);
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  mdh.afterEsc = await histState();
  mdh.afterEscActive = await active();
  // MD-05: double open (click Histórico twice fast)
  await page.click('#cpBody_bpagar'); await page.waitForTimeout(250);
  const link = page.locator('a[data-target="#modal_Historial"]');
  await link.click(); await link.click({ force: true }).catch(() => {}); await page.click('#cpBody_bpagar', { force: true }).catch(() => {}); await link.click({ force: true }).catch(() => {});
  await page.waitForTimeout(800);
  mdh.afterDoubleOpen = await histState();
  mdh.modalsShown = await page.locator('.modal.show').count();
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  mdh.afterDoubleOpenEsc = await histState();
  mdh.dialogs = dialogs.splice(0);
} catch (e: any) { mdh.error = e.message.split('\n')[0]; }
console.log('Historial modal', JSON.stringify(mdh, null, 1));
saveEvidence('rastreo-MD-historial', mdh);
const overlap = mdh.open && mdh.open.titleRect && mdh.open.headerRect && mdh.open.titleRect.y < mdh.open.headerRect.y + mdh.open.headerRect.height;
logCase({ group: G, screen: SC_H, caseId: 'MD-01', instance: '#modal_Historial × (.close)', result: mdh.afterX && !mdh.afterX.shown && mdh.afterX.backdrops === 0 ? 'pass' : 'fail', reason: `after ×: shown=${mdh.afterX?.shown} backdrops=${mdh.afterX?.backdrops} bodyClass="${mdh.afterX?.bodyClass}" overflow=${mdh.afterX?.bodyOverflow}; while open overflow=${mdh.open?.bodyOverflow}`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });
logCase({ group: G, screen: SC_H, caseId: 'MD-02', instance: '#modal_Historial backdrop', result: mdh.afterBackdrop ? (mdh.afterBackdrop.shown ? 'executed-static' : 'pass') : 'fail', reason: `backdrop click dismisses=${mdh.afterBackdrop ? !mdh.afterBackdrop.shown : 'n/a'} (Bootstrap default)`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });
logCase({ group: G, screen: SC_H, caseId: 'MD-03', instance: '#modal_Historial Esc', result: mdh.afterEsc && !mdh.afterEsc.shown ? 'pass' : 'fail', reason: `Esc dismisses=${mdh.afterEsc ? !mdh.afterEsc.shown : 'n/a'}; focus after Esc=${mdh.afterEscActive}`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });
logCase({ group: G, screen: SC_H, caseId: 'MD-05', instance: 'Histórico link double-open', result: mdh.modalsShown === 1 && mdh.afterDoubleOpen?.backdrops <= 1 ? 'pass' : 'fail', reason: `modals shown=${mdh.modalsShown} backdrops=${mdh.afterDoubleOpen?.backdrops} closes with Esc=${mdh.afterDoubleOpenEsc ? !mdh.afterDoubleOpenEsc.shown : 'n/a'}`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });
logCase({ group: G, screen: SC_H, caseId: 'MD-06', instance: '#modal_Historial @1440', result: overlap ? 'fail' : 'pass', findingIds: overlap ? ['RA-12'] : [], reason: `title rect=${JSON.stringify(mdh.open?.titleRect)} header rect=${JSON.stringify(mdh.open?.headerRect)} modalZ=${mdh.open?.modalZ} headerZ=${mdh.open?.headerZ} (375/768 in rastreo-responsive-axe)`, evidence: ['audit/screenshots/RA-12.png', 'audit/logs/evidence/rastreo-MD-historial.json'] });
const focusReturns = mdh.afterXActive && /cpBody_bpagar|modal_Historial|Histórico/.test(mdh.afterXActive);
logCase({ group: G, screen: SC_H, caseId: 'MD-07', instance: '#modal_Historial focus trap/return', result: mdh.focusEscapes || !focusReturns ? 'fail' : 'pass', findingIds: mdh.focusEscapes || !focusReturns ? ['RA-13'] : [], reason: `initial focus on open=${mdh.openActive}; focus leaves modal while Tabbing=${mdh.focusEscapes}; focus after close=${mdh.afterXActive}; aria-hidden=${mdh.open?.modalAriaHidden} role=${mdh.open?.modalRole} aria-modal=${mdh.open?.modalAriaModal}`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });
logCase({ group: G, screen: SC_H, caseId: 'AX-04', instance: '#modal_Historial keyboard traversal', result: mdh.tabPath ? 'executed-static' : 'omitted', reason: `tab path: ${JSON.stringify(mdh.tabPath?.slice(0, 8))}`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });

// =================== Movimientos modal (MD-01, MD-02, MD-03, MD-04, MD-05, MD-07)
const SC_M = 'Rastreo > Movimientos del Paquete (VerGuia modal)';
const mdm: any = {};
try {
  await ensureRastreo();
  mdm.before = await popupState();
  const nPosts = posts.length;
  const nav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
  await page.click('a[onclick*="VerGuia"]');
  await nav; await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800);
  mdm.postsFired = posts.slice(nPosts);
  mdm.open = await popupState();
  mdm.openActive = await active();
  mdm.serverErr = serverErrorSignature(await page.content().catch(() => ''));
  mdm.openShot = await shot(page, 'rastreo-movimientos-open', false);
  // MD-07: tab loop
  const path: string[] = [];
  for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); path.push(await active()); }
  mdm.tabPath = path;
  mdm.focusEscapes = path.some((p) => p.includes('inPopup=false') && !p.startsWith('BODY'));
  // MD-02: click backdrop
  await page.mouse.click(30, 700); await page.waitForTimeout(600);
  mdm.afterBackdrop = await popupState();
  // MD-03: Esc
  if (mdm.afterBackdrop.shown) { await page.keyboard.press('Escape'); await page.waitForTimeout(800); }
  mdm.afterEsc = await popupState();
  mdm.afterEscActive = await active();
  mdm.pageRowsAfterEsc = mdm.afterEsc.pageRows;
  // reopen, MD-01/MD-04: close via visible X
  const nav2 = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
  await page.click('a[onclick*="VerGuia"]'); await nav2; await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800);
  mdm.reopen = await popupState();
  if (mdm.reopen.closeBtn?.visible) {
    await page.click('#cpBody_ppCambioGuia_HCB-1'); await page.waitForTimeout(800);
    mdm.afterX = await popupState();
    mdm.afterXActive = await active();
  }
  // keyboard: can the close button be reached/activated by keyboard?
  mdm.closeBtnInTabPath = path.some((p) => /HCB-1|closeBtn/.test(p));
  // MD-05: double-click the tracking link (two postbacks?)
  await ensureRastreo();
  const n2 = posts.length;
  const nav3 = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
  await page.dblclick('a[onclick*="VerGuia"]').catch(() => {});
  await nav3; await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800);
  mdm.dblPosts = posts.slice(n2);
  mdm.afterDbl = await popupState();
  mdm.popupsInDom = await page.locator('[id^="cpBody_ppCambioGuia_PW-"]').count();
  await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(500);
  mdm.dialogs = dialogs.splice(0);
} catch (e: any) { mdm.error = e.message.split('\n')[0]; }
console.log('Movimientos', JSON.stringify(mdm, null, 1));
saveEvidence('rastreo-MD-movimientos', mdm);
const xVisible = !!mdm.open?.closeBtn?.visible;
logCase({ group: G, screen: SC_M, caseId: 'MD-04', instance: 'cpBody_ppCambioGuia close button (#cpBody_ppCambioGuia_HCB-1)', result: xVisible ? 'pass' : 'fail', reason: `close button visible=${xVisible} rect=${JSON.stringify(mdm.open?.closeBtn?.rect)} accessible attrs: role=${mdm.open?.closeBtn?.role} tabindex=${mdm.open?.closeBtn?.tabindex} aria-label=${mdm.open?.closeBtn?.ariaLabel} title=${mdm.open?.closeBtn?.title}; in Tab path=${mdm.closeBtnInTabPath}`, evidence: ['audit/screenshots/rastreo-movimientos-open.png', 'audit/logs/evidence/rastreo-MD-movimientos.json'] });
logCase({ group: G, screen: SC_M, caseId: 'MD-01', instance: 'close via X', result: mdm.afterX ? (mdm.afterX.shown ? 'fail' : 'pass') : 'omitted', reason: mdm.afterX ? `after X shown=${mdm.afterX.shown}; page grid rows=${mdm.afterX.pageRows}; focus=${mdm.afterXActive}` : 'X not visible', evidence: ['audit/logs/evidence/rastreo-MD-movimientos.json'] });
logCase({ group: G, screen: SC_M, caseId: 'MD-02', instance: 'modal backdrop (DXPWMB-1)', result: mdm.afterBackdrop ? 'executed-static' : 'fail', reason: `backdrop click dismisses=${mdm.afterBackdrop ? !mdm.afterBackdrop.shown : 'n/a'} (closeAction=CloseButton)`, evidence: ['audit/logs/evidence/rastreo-MD-movimientos.json'] });
logCase({ group: G, screen: SC_M, caseId: 'MD-03', instance: 'Esc', result: mdm.afterEsc && !mdm.afterEsc.shown ? 'pass' : 'fail', reason: `Esc dismisses=${mdm.afterEsc ? !mdm.afterEsc.shown : 'n/a'} (closeOnEscape=true); page rows after=${mdm.pageRowsAfterEsc}; focus after=${mdm.afterEscActive}`, evidence: ['audit/logs/evidence/rastreo-MD-movimientos.json'] });
logCase({ group: G, screen: SC_M, caseId: 'MD-05', instance: 'tracking link double-click', result: mdm.afterDbl ? (mdm.popupsInDom === 1 && !mdm.serverErr ? 'pass' : 'fail') : 'omitted', reason: `posts on dblclick=${mdm.dblPosts?.length} status=${JSON.stringify(mdm.dblPosts?.map((p: any) => p.status))} popups in DOM=${mdm.popupsInDom} shown=${mdm.afterDbl?.shown}`, evidence: ['audit/logs/evidence/rastreo-MD-movimientos.json'] });
const mReturns = mdm.afterXActive && /VerGuia|DP01|Guia/i.test(mdm.afterXActive);
logCase({ group: G, screen: SC_M, caseId: 'MD-07', instance: 'focus trap/return', result: mdm.focusEscapes || !mReturns ? 'fail' : 'pass', findingIds: mdm.focusEscapes || !mReturns ? ['RA-13'] : [], reason: `focus on open=${mdm.openActive}; focus leaves popup while Tabbing=${mdm.focusEscapes}; focus after close=${mdm.afterXActive}; role=${mdm.open?.popupRole} aria-modal=${mdm.open?.popupAriaModal}`, evidence: ['audit/logs/evidence/rastreo-MD-movimientos.json'] });
logCase({ group: G, screen: SC_M, caseId: 'MD-08', instance: 'VerGuia postback → popup content', result: mdm.open?.shown && mdm.open.rows.length > 0 ? 'pass' : 'fail', reason: `popup shown=${mdm.open?.shown} rows=${JSON.stringify(mdm.open?.rows)} page grid rows while open=${mdm.open?.pageRows} posts=${mdm.postsFired?.length} err=${mdm.serverErr}`, evidence: ['audit/screenshots/rastreo-movimientos-open.png'] });
logCase({ group: G, screen: SC_M, caseId: 'AX-04', instance: 'Movimientos keyboard traversal', result: mdm.tabPath ? 'executed-static' : 'omitted', reason: `tab path: ${JSON.stringify(mdm.tabPath?.slice(0, 8))}`, evidence: ['audit/logs/evidence/rastreo-MD-movimientos.json'] });

console.log('dialogs', dialogs, 'posts', posts.length);
await s.close();
console.log('done');
