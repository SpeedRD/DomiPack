// Historial Guías modal (#modal_Historial): MD-01, MD-02, MD-03, MD-05, MD-06@1440, MD-07, AX-04 (modal tab loop).
// Split out of rastreo-modals.ts (that run timed out on the open step after the Menu MD-10 sequence).
import { Page } from 'playwright';
import { startSession, go, shot, saveEvidence, logCase } from '../../support/phase4.ts';

const G = 'rastreo';
const SC_H = 'Rastreo > Historial Guías (modal)';
const s = await startSession({ name: 'p4-rastreo-modals-historial' });
const page = s.page;
await s.context.addInitScript('window.__name = window.__name || (function(f){return f;});');
await page.evaluate('window.__name = window.__name || (function(f){return f;});');
await go(page, 'Rastreo.aspx');
await page.waitForLoadState('networkidle').catch(() => {});
const dialogs: string[] = [];
page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()}`); await d.dismiss().catch(() => {}); });

const active = () => page.evaluate(() => { const e = document.activeElement as HTMLElement | null; return e ? `${e.tagName}#${e.id}.${(e.className || '').toString().slice(0, 30)}|${(e.innerText || '').trim().slice(0, 25)}|inHistorial=${!!e.closest('#modal_Historial')}` : 'null'; });
const histState = () => page.evaluate(() => {
  const m = document.querySelector('#modal_Historial') as HTMLElement | null;
  const shown = !!m && m.classList.contains('show') && getComputedStyle(m).display !== 'none';
  const backdrops = document.querySelectorAll('.modal-backdrop').length;
  const dlg = m?.querySelector('.modal-dialog') as HTMLElement | null;
  const header = document.querySelector('.app-header') as HTMLElement | null;
  const title = m?.querySelector('.modal-header') as HTMLElement | null;
  const close = m?.querySelector('.close') as HTMLElement | null;
  const r = (e: HTMLElement | null) => e ? (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }))(e.getBoundingClientRect()) : null;
  const at = (e: HTMLElement | null) => { if (!e) return null; const rr = e.getBoundingClientRect(); const el = document.elementFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2); return el ? `${el.tagName}#${el.id}.${el.className.toString().slice(0, 40)} inModal=${!!el.closest('#modal_Historial')}` : null; };
  return { shown, backdrops, bodyClass: document.body.className, bodyOverflow: getComputedStyle(document.body).overflow, modalZ: m ? getComputedStyle(m).zIndex : null, headerZ: header ? getComputedStyle(header).zIndex : null, headerPos: header ? getComputedStyle(header).position : null, dialogRect: r(dlg), headerRect: r(header), titleRect: r(title), closeRect: r(close), elementAtClose: at(close), elementAtTitle: at(title), modalAriaHidden: m?.getAttribute('aria-hidden'), modalRole: m?.getAttribute('role'), modalAriaModal: m?.getAttribute('aria-modal'), modalTabindex: m?.getAttribute('tabindex'), closeAria: close ? { ariaLabel: close.getAttribute('aria-label'), text: close.innerText, title: close.getAttribute('title') } : null, vw: innerWidth, vh: innerHeight };
});
async function openHistorial(p: Page) {
  await p.click('#cpBody_bpagar', { timeout: 10000 });
  await p.waitForTimeout(400);
  await p.click('a[data-target="#modal_Historial"]', { timeout: 10000 });
  await p.waitForSelector('#modal_Historial.show', { timeout: 5000 });
  await p.waitForTimeout(600);
}
async function closeIfOpen() {
  if (await page.locator('#modal_Historial.show').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
  if (await page.locator('#modal_Historial.show').count()) { await page.mouse.click(20, 700); await page.waitForTimeout(600); } // backdrop click is the reliable closer
}

const mdh: any = { steps: [] as string[] };
try {
  mdh.scrollBefore = await page.evaluate(() => ({ overflow: getComputedStyle(document.body).overflow, cls: document.body.className }));
  mdh.triggerBefore = await active();
  await openHistorial(page); mdh.steps.push('opened-1');
  mdh.open = await histState();
  mdh.openActive = await active();
  mdh.openShot = await shot(page, 'RA-12', false);
  // MD-07: tab loop inside modal
  const path: string[] = [];
  for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); path.push(await active()); }
  mdh.tabPath = path;
  mdh.focusEscapes = path.some((p) => p.includes('inHistorial=false') && !p.startsWith('BODY'));
  // MD-01: close via × (try normal click; on interception fall back to force and record)
  try { await page.click('#modal_Historial .close', { timeout: 5000 }); mdh.closeClick = 'normal'; }
  catch (e: any) { mdh.closeClick = 'intercepted: ' + e.message.split('\n').slice(0, 3).join(' | ').slice(0, 300); await page.click('#modal_Historial .close', { force: true }); }
  await page.waitForTimeout(700);
  mdh.afterX = await histState();
  mdh.afterXActive = await active();
  mdh.steps.push('closed-x');
  if (mdh.afterX.shown) {
    // × did not close it (covered by the app header). Try clicking the × at its visible bottom edge (below the header), then Esc.
    const cr = mdh.open.closeRect;
    await page.mouse.click(cr.x + cr.width / 2, cr.y + cr.height - 2).catch(() => {});
    await page.waitForTimeout(500);
    mdh.afterXBottomEdge = await histState();
    if (mdh.afterXBottomEdge.shown) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
    mdh.afterXThenEsc = await histState();
  }
  // MD-02: backdrop click
  await openHistorial(page); mdh.steps.push('opened-2');
  await page.mouse.click(20, 700); await page.waitForTimeout(700);
  mdh.afterBackdrop = await histState();
  await closeIfOpen();
  // MD-03: Esc
  await openHistorial(page); mdh.steps.push('opened-3');
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  mdh.afterEsc = await histState();
  mdh.afterEscActive = await active();
  // MD-03b: Esc with focus INSIDE the modal (Tab to the date input first)
  if (mdh.afterEsc.shown) {
    await page.focus('#cpBody_lDesde'); await page.waitForTimeout(200);
    mdh.escInsideActive = await active();
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    mdh.afterEscInside = await histState();
  }
  await closeIfOpen();
  // MD-05: double open (fire the Bootstrap trigger twice quickly)
  await page.click('#cpBody_bpagar'); await page.waitForTimeout(300);
  await page.evaluate(() => { const a = document.querySelector('a[data-target="#modal_Historial"]') as HTMLElement; a.click(); a.click(); });
  await page.waitForTimeout(900);
  mdh.afterDoubleOpen = await histState();
  mdh.modalsShown = await page.locator('.modal.show').count();
  await page.focus('#cpBody_lDesde').catch(() => {}); await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  mdh.afterDoubleOpenEsc = await histState();
  await closeIfOpen();
  mdh.dialogs = dialogs.splice(0);
} catch (e: any) { mdh.error = e.message.split('\n')[0]; }
console.log('Historial modal', JSON.stringify(mdh, null, 1));
saveEvidence('rastreo-MD-historial', mdh);
const overlap = !!(mdh.open && mdh.open.titleRect && mdh.open.headerRect && mdh.open.titleRect.y < mdh.open.headerRect.y + mdh.open.headerRect.height);
const closeCovered = !!(mdh.open?.elementAtClose && /inModal=false/.test(mdh.open.elementAtClose));
logCase({ group: G, screen: SC_H, caseId: 'MD-01', instance: '#modal_Historial × (.close)', result: mdh.afterX && !mdh.afterX.shown && mdh.afterX.backdrops === 0 && !closeCovered ? 'pass' : 'fail', findingIds: closeCovered ? ['RA-12'] : [], reason: `close click=${mdh.closeClick}; element at × center=${mdh.open?.elementAtClose}; after ×: shown=${mdh.afterX?.shown} backdrops=${mdh.afterX?.backdrops} bodyClass="${mdh.afterX?.bodyClass}" overflow=${mdh.afterX?.bodyOverflow}; while open overflow=${mdh.open?.bodyOverflow}`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json', 'audit/screenshots/RA-12.png'] });
logCase({ group: G, screen: SC_H, caseId: 'MD-02', instance: '#modal_Historial backdrop', result: mdh.afterBackdrop ? 'executed-static' : 'fail', reason: `backdrop click dismisses=${mdh.afterBackdrop ? !mdh.afterBackdrop.shown : 'n/a'} (Bootstrap default; Movimientos popup does NOT dismiss on backdrop → inconsistent)`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });
const escOnOpenWorks = !!(mdh.afterEsc && !mdh.afterEsc.shown);
const escInsideWorks = !!(mdh.afterEscInside && !mdh.afterEscInside.shown);
logCase({ group: G, screen: SC_H, caseId: 'MD-03', instance: '#modal_Historial Esc', result: escOnOpenWorks ? 'pass' : 'fail', findingIds: escOnOpenWorks ? [] : ['RA-13'], reason: `Esc right after opening (focus on trigger ${mdh.afterEscActive}) dismisses=${escOnOpenWorks}; Esc with focus inside (${mdh.escInsideActive}) dismisses=${escInsideWorks}`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });
logCase({ group: G, screen: SC_H, caseId: 'MD-05', instance: 'Histórico link double-open', result: mdh.modalsShown === 1 && (mdh.afterDoubleOpen?.backdrops ?? 9) <= 1 ? 'pass' : 'fail', reason: `modals shown=${mdh.modalsShown} backdrops=${mdh.afterDoubleOpen?.backdrops} closes with Esc=${mdh.afterDoubleOpenEsc ? !mdh.afterDoubleOpenEsc.shown : 'n/a'}`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });
logCase({ group: G, screen: SC_H, caseId: 'MD-06', instance: '#modal_Historial @1440', result: overlap || closeCovered ? 'fail' : 'pass', findingIds: overlap || closeCovered ? ['RA-12'] : [], reason: `modal-header rect=${JSON.stringify(mdh.open?.titleRect)} app-header rect=${JSON.stringify(mdh.open?.headerRect)} (${mdh.open?.headerPos}, z=${mdh.open?.headerZ}) modal z=${mdh.open?.modalZ}; element at title center=${mdh.open?.elementAtTitle}; element at × center=${mdh.open?.elementAtClose}`, evidence: ['audit/screenshots/RA-12.png', 'audit/logs/evidence/rastreo-MD-historial.json'] });
const focusReturns = !!(mdh.afterXActive && /cpBody_bpagar|modal_Historial|Histórico/.test(mdh.afterXActive));
const initialInModal = !!(mdh.openActive && /inHistorial=true/.test(mdh.openActive));
logCase({ group: G, screen: SC_H, caseId: 'MD-07', instance: '#modal_Historial focus trap/return', result: mdh.focusEscapes || !focusReturns || !initialInModal ? 'fail' : 'pass', findingIds: mdh.focusEscapes || !focusReturns || !initialInModal ? ['RA-13'] : [], reason: `initial focus on open=${mdh.openActive}; focus leaves modal while Tabbing=${mdh.focusEscapes}; focus after close=${mdh.afterXActive}; aria-hidden=${mdh.open?.modalAriaHidden} role=${mdh.open?.modalRole} aria-modal=${mdh.open?.modalAriaModal} close aria=${JSON.stringify(mdh.open?.closeAria)}`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });
logCase({ group: G, screen: SC_H, caseId: 'AX-04', instance: '#modal_Historial keyboard traversal', result: mdh.tabPath ? 'executed-static' : 'omitted', reason: `tab path: ${JSON.stringify(mdh.tabPath?.slice(0, 10))}`, evidence: ['audit/logs/evidence/rastreo-MD-historial.json'] });

await s.close();
console.log('done');
