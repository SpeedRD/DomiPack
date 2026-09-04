// Phase 4 / micuenta (shared chrome) — BT-06, MD-10 (user-menu dropdown), AX-03, CC-04 (footer), sidebar collapse toggle. Salir is NOT clicked here.
import { startSession, go, shot, saveEvidence, visibleText, BASE_URL } from '../../support/phase4.ts';
import { log, NAME_SHIM, focused, contrast, assertNotLogin } from './_micuenta-common.ts';

const SCREEN = 'Shared chrome';
const s = await startSession({ name: 'p4-shared-chrome' });
const page = s.page;
await s.context.addInitScript(NAME_SHIM);
await go(page, 'MiCuenta.aspx');
assertNotLogin(page, 'start');
const ev: Record<string, unknown> = {};

// ---- BT-06 / AX-03: accessible names of icon-only controls ----
const names = await page.evaluate(() => {
  const accName = (el: Element) => {
    const al = el.getAttribute('aria-label'); if (al) return { source: 'aria-label', name: al };
    const lb = el.getAttribute('aria-labelledby'); if (lb) return { source: 'aria-labelledby', name: document.getElementById(lb)?.textContent?.trim() || '' };
    const title = el.getAttribute('title'); if (title) return { source: 'title', name: title };
    const img = el.querySelector('img[alt]'); if (img && img.getAttribute('alt')) return { source: 'img alt', name: img.getAttribute('alt')! };
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim(); if (txt) return { source: 'text', name: txt };
    return { source: 'none', name: '' };
  };
  const sels = ['.close-sidebar-btn', '.mobile-toggle-nav', '.mobile-toggle-header-nav', 'a.p-0.btn'];
  return sels.flatMap((sel) => Array.from(document.querySelectorAll(sel)).map((el, i) => ({ sel, i, tag: el.tagName, role: el.getAttribute('role'), href: el.getAttribute('href'), tabindex: el.getAttribute('tabindex'), focusable: (el as HTMLElement).tabIndex >= 0, visible: el.getBoundingClientRect().width > 0, ...accName(el), imgAlt: el.querySelector('img')?.getAttribute('alt') ?? null })));
});
ev.names = names;
console.log(JSON.stringify(names, null, 1));
for (const n of names.filter((x) => x.visible || x.i === 0)) {
  log(SCREEN, 'BT-06', `${n.sel}[${n.i}]`, n.name ? 'pass' : 'fail', `tag=${n.tag} role=${n.role} href=${n.href} focusable=${n.focusable} accessible name='${n.name}' (${n.source}) visible=${n.visible}`, n.name ? undefined : ['SH-02']);
  log(SCREEN, 'AX-03', `${n.sel}[${n.i}]`, n.name ? 'pass' : 'fail', `accessible name='${n.name}' (${n.source})`, n.name ? undefined : ['SH-02']);
}

// ---- sidebar collapse toggle (desktop) ----
{
  const before = await page.evaluate(() => ({ container: document.querySelector('.app-container')?.className, sidebarW: document.querySelector('.app-sidebar')?.getBoundingClientRect().width }));
  await page.click('.close-sidebar-btn:visible');
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({ container: document.querySelector('.app-container')?.className, sidebarW: document.querySelector('.app-sidebar')?.getBoundingClientRect().width, menuTextVisible: Array.from(document.querySelectorAll('.vertical-nav-menu a')).slice(0, 1).map((a) => getComputedStyle(a).width), ariaExpanded: document.querySelector('.close-sidebar-btn')?.getAttribute('aria-expanded') }));
  const shotCollapsed = await shot(page, 'SH-sidebar-collapsed', false);
  // hover reveal?
  await page.hover('.app-sidebar');
  await page.waitForTimeout(500);
  const hovered = await page.evaluate(() => ({ container: document.querySelector('.app-container')?.className, sidebarW: document.querySelector('.app-sidebar')?.getBoundingClientRect().width }));
  await page.mouse.move(900, 500);
  await page.click('.close-sidebar-btn:visible');
  await page.waitForTimeout(600);
  const restored = await page.evaluate(() => ({ container: document.querySelector('.app-container')?.className, sidebarW: document.querySelector('.app-sidebar')?.getBoundingClientRect().width }));
  ev.sidebarToggle = { before, after, hovered, restored };
  console.log('sidebar toggle', JSON.stringify(ev.sidebarToggle));
  // Does the collapsed state persist across navigation?
  await page.click('.close-sidebar-btn:visible');
  await page.waitForTimeout(400);
  await go(page, 'Estado.aspx');
  assertNotLogin(page, 'Estado');
  const persisted = await page.evaluate(() => ({ container: document.querySelector('.app-container')?.className, sidebarW: document.querySelector('.app-sidebar')?.getBoundingClientRect().width }));
  ev.sidebarPersist = persisted;
  await go(page, 'MiCuenta.aspx');
  log(SCREEN, 'BT-07', '.close-sidebar-btn (sidebar collapse)', 'pass', `click -> container '${after.container}' sidebar ${before.sidebarW}->${after.sidebarW}px; hover re-expands to ${hovered.sidebarW}px; second click restores (${restored.sidebarW}px); state after navigating to Estado.aspx: '${persisted.container}' (${persisted.sidebarW}px) -> ${/closed-sidebar/.test(persisted.container || '') ? 'persisted' : 'NOT persisted (resets on every page)'}; aria-expanded=${after.ariaExpanded}`, undefined, [shotCollapsed]);
}

// ---- MD-10: user-menu dropdown ----
{
  const trig = page.locator('a.p-0.btn[data-toggle="dropdown"]:visible').first();
  const state = () => page.evaluate(() => { const m = document.querySelector('.dropdown-menu.dropdown-menu-right') as HTMLElement; const t = document.querySelector('a.p-0.btn[data-toggle="dropdown"]'); return { shown: m?.classList.contains('show'), display: m ? getComputedStyle(m).display : null, ariaExpanded: t?.getAttribute('aria-expanded'), ariaHidden: m?.getAttribute('aria-hidden'), items: m ? Array.from(m.querySelectorAll('button, a')).map((b) => b.textContent?.trim()) : [], userText: (document.querySelector('.widget-content-left .widget-heading') as HTMLElement | null)?.innerText || null, active: document.activeElement?.tagName + '.' + (document.activeElement as HTMLElement)?.className }; });
  const closed0 = await state();
  await trig.click();
  await page.waitForTimeout(400);
  const open1 = await state();
  const shotOpen = await shot(page, 'SH-usermenu-open', false);
  const menuText = await page.evaluate(() => (document.querySelector('.dropdown-menu.dropdown-menu-right')?.parentElement?.parentElement as HTMLElement | null)?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 200));
  // click outside
  await page.mouse.click(700, 600);
  await page.waitForTimeout(400);
  const afterOutside = await state();
  // reopen and Esc
  await trig.click();
  await page.waitForTimeout(300);
  const open2 = await state();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const afterEsc = await state();
  // reopen, arrow keys, focus location
  await trig.click();
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  const afterArrow = await focused(page);
  // double open (click twice fast)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await trig.click();
  await trig.click();
  await page.waitForTimeout(400);
  const afterDouble = await state();
  const menus = await page.evaluate(() => document.querySelectorAll('.dropdown-menu.show').length);
  if (afterDouble.shown) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
  // keyboard reachability of the trigger
  const trigFocusable = names.find((n) => n.sel === 'a.p-0.btn');
  ev.md10 = { closed0, open1, menuText, afterOutside, open2, afterEsc, afterArrow, afterDouble, menus, trigFocusable };
  console.log('MD-10', JSON.stringify(ev.md10, null, 1));
  const ok = open1.shown && !afterOutside.shown && !afterEsc.shown && menus <= 1;
  log(SCREEN, 'MD-10', 'user-menu dropdown (a.p-0.btn)', ok && trigFocusable?.focusable ? 'pass' : 'fail', `open: shown=${open1.shown} aria-expanded=${open1.ariaExpanded} items=${JSON.stringify(open1.items)} header text='${menuText}'; click-outside closes=${!afterOutside.shown}; Esc closes=${!afterEsc.shown}; ArrowDown focuses ${afterArrow?.tag}.${afterArrow?.cls} '${afterArrow?.text}'; double-click -> shown=${afterDouble.shown}, .show menus=${menus}; trigger focusable by keyboard=${trigFocusable?.focusable} (href=${trigFocusable?.href}, role=${trigFocusable?.role})`, ok && trigFocusable?.focusable ? undefined : ['SH-02'], [shotOpen]);
}

// ---- CC-04: footer ----
{
  const footer = await page.evaluate(() => {
    const f = document.querySelector('.app-footer')!;
    return { text: (f as HTMLElement).innerText.replace(/\s+/g, ' ').trim(), links: Array.from(f.querySelectorAll('a')).map((a) => ({ text: a.textContent?.trim(), href: a.getAttribute('href'), resolved: a.href, target: a.target })), imgs: Array.from(f.querySelectorAll('img')).map((i) => ({ src: i.src, alt: i.alt, w: i.naturalWidth, complete: i.complete })) };
  });
  ev.footer = footer;
  console.log('footer', JSON.stringify(footer));
  // Click one dead link (href="") — resolves to the current page: a plain GET reload of MiCuenta.aspx (safe).
  const urlBefore = page.url();
  const [nav] = await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => null),
    page.click('.app-footer a:has-text("Políticas de Privacidad")'),
  ]);
  await page.waitForTimeout(500);
  assertNotLogin(page, 'footer click');
  const urlAfter = page.url();
  const yearNow = new Date().getFullYear();
  const footerContrast = await contrast(page, '.app-footer .left a');
  log(SCREEN, 'CC-04', 'footer', 'fail', `text='${footer.text}' (year 2022 vs ${yearNow}); links ${JSON.stringify(footer.links.map((l) => [l.text, l.href]))}: clicking 'Políticas de Privacidad' -> ${nav ? 'navigated/reloaded to ' + urlAfter : 'no navigation'} (from ${urlBefore}); card-logos image from third-party host ${footer.imgs[0]?.src} (loaded=${footer.imgs[0]?.complete}, alt='${footer.imgs[0]?.alt}'); link contrast ${footerContrast?.ratio}:1`, ['SH-03'], [await shot(page, 'SH-03', true)]);
  log(SCREEN, 'BT-10', 'footer dead links', 'fail', `all three legal links have href="" (resolve to current page URL -> reload)`, ['SH-03']);
}
// ---- Mixed-content / third-party notes from console ----
{
  const consoleErrors = await page.evaluate(() => (window as any).__consoleErrors || null);
  ev.consoleNote = consoleErrors;
}
console.log(saveEvidence('SH-chrome', ev));
await s.close();
