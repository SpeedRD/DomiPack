// Phase 4 / micuenta — BT-11/AX-04 verification: read focus styles AFTER CSS transitions settle (Bootstrap .form-control has a 150ms transition).
import { startSession, go, shot, saveEvidence } from '../../support/phase4.ts';
import { log, NAME_SHIM, focused, assertNotLogin, TAB } from './_micuenta-common.ts';

const s = await startSession({ name: 'p4-micuenta-focus' });
const page = s.page;
await s.context.addInitScript(NAME_SHIM);
await go(page, 'MiCuenta.aspx');
assertNotLogin(page, 'start');
const targets = ['#cpBody_lNombre', '#cpBody_lContrasena', '#cpBody_Button1', '#cpBody_ltab2', '#lRastreo', '.close-sidebar-btn', '.app-footer a:nth-child(2)'];
const out: any[] = [];
for (const t of targets) {
  await page.focus(t);
  await page.waitForTimeout(500); // let transitions finish
  const f = await focused(page);
  // re-read styles directly after settle (focused() blurs/refocuses; read once more after another settle)
  await page.waitForTimeout(400);
  const settled = await page.$eval(t, (el) => { const cs = getComputedStyle(el); return { outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, boxShadow: cs.boxShadow, borderColor: cs.borderColor, bg: cs.backgroundColor, matchesFocus: el.matches(':focus'), matchesFocusVisible: el.matches(':focus-visible') }; });
  const box = await page.$eval(t, (el) => { const r = el.getBoundingClientRect(); return { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 12), width: r.width + 24, height: r.height + 24 }; });
  const file = `audit/screenshots/focus-${t.replace(/[^a-z0-9]/gi, '')}.png`;
  await page.screenshot({ path: file, clip: box });
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.waitForTimeout(400);
  const blurred = await page.$eval(t, (el) => { const cs = getComputedStyle(el); return { boxShadow: cs.boxShadow, borderColor: cs.borderColor, bg: cs.backgroundColor }; });
  out.push({ t, settled, blurred, file, quick: { indicator: f?.indicator, shadow: f?.boxShadow } });
  console.log(t, JSON.stringify({ settled, blurred }));
}
// Keyboard reachability of the user-menu trigger (<a class="p-0 btn"> without href): Tab from the hamburger.
await page.focus('.close-sidebar-btn');
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
const afterHamburger = await focused(page);
const trigTab = await page.$eval('a.p-0.btn', (el) => { const sb = document.querySelector('.app-sidebar')!; (el as HTMLElement).focus(); return { tabIndex: (el as HTMLElement).tabIndex, hasHref: el.hasAttribute('href'), tabindexAttr: el.getAttribute('tabindex'), beforeSidebarInDom: !!(el.compareDocumentPosition(sb) & Node.DOCUMENT_POSITION_FOLLOWING), programmaticFocusWorks: document.activeElement === el, visible: el.getBoundingClientRect().width > 0 }; });
console.log('Tab after hamburger ->', afterHamburger?.tag, afterHamburger?.id, afterHamburger?.cls, 'trigger', JSON.stringify(trigTab));
log('Shared chrome', 'MD-10', 'user-menu trigger keyboard reachability', /p-0 btn/.test(afterHamburger?.cls || '') ? 'pass' : 'fail', `Tab from .close-sidebar-btn lands on ${afterHamburger?.tag}#${afterHamburger?.id} '${afterHamburger?.cls}' (trigger tabIndex=${trigTab.tabIndex}, href=${trigTab.hasHref}, precedes sidebar in DOM=${trigTab.beforeSidebarInDom}, el.focus() works=${trigTab.programmaticFocusWorks}) -> the dropdown trigger is ${/p-0 btn/.test(afterHamburger?.cls || '') ? 'reachable' : 'NOT reachable'} by keyboard, so Salir cannot be reached without a mouse`, /p-0 btn/.test(afterHamburger?.cls || '') ? undefined : ['SH-02']);
console.log(saveEvidence('MC-08-focus-styles', out));
const styled = out.filter((o) => o.settled);
const noInd = styled.filter((o) => o.settled.outline.startsWith('none') && (o.settled.boxShadow === 'none' || /rgba\(0, 0, 0, 0\)/.test(o.settled.boxShadow)) && o.settled.borderColor === o.blurred.borderColor && o.settled.bg === o.blurred.bg);
log(TAB.datos.screen, 'BT-11', 'focus-visible after transitions settle: ' + targets.join(', '), noInd.length ? 'fail' : 'pass', `no indicator on: ${noInd.map((o) => o.t).join(', ') || 'none'}; with indicator: ${styled.filter((o) => !noInd.includes(o)).map((o) => `${o.t} (${o.settled.boxShadow !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(o.settled.boxShadow) ? 'box-shadow' : ''}${o.settled.borderColor !== o.blurred.borderColor ? ' border' : ''}${o.settled.bg !== o.blurred.bg ? ' bg' : ''})`).join(', ')}`, noInd.length ? ['MC-08'] : undefined, styled.map((o) => o.file));
log('Shared chrome', 'AX-04', 'CORRECTION of the traversal reading in micuenta-responsive-axe (styles were read mid-transition)', noInd.length ? 'fail' : 'pass', `after settle: text inputs DO show focus (box-shadow + border); no indicator on: ${noInd.map((o) => o.t).join(', ')}`, noInd.length ? ['MC-08'] : undefined);
await s.close();
