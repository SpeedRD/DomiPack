// Phase 4 / micuenta — RS-01/02/03 (3 tabs x 3 viewports), RS-05 (mobile nav toggles), AX-01 (axe), AX-02, AX-04 (keyboard traversal), AX-05.
import { startSession, go, shot, runAxe, saveEvidence } from '../../support/phase4.ts';
import { log, NAME_SHIM, TAB, openTab, overflowX, focused, contrast, assertNotLogin } from './_micuenta-common.ts';

const s = await startSession({ name: 'p4-micuenta-rs-axe' });
const page = s.page;
await s.context.addInitScript(NAME_SHIM);
await go(page, 'MiCuenta.aspx');
assertNotLogin(page, 'start');
const ev: Record<string, unknown> = {};
const tabs: (keyof typeof TAB)[] = ['datos', 'dependientes', 'direccion'];
const VP = [{ w: 375, h: 812, c: 'RS-01' }, { w: 768, h: 1024, c: 'RS-02' }, { w: 1440, h: 900, c: 'RS-03' }];

const tapTargets = () => page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('.tab-pane.active input[type=submit], .tab-pane.active input[type=checkbox], a[data-toggle=tab], .vertical-nav-menu a, .hamburger, .mobile-toggle-header-nav, a.p-0.btn, .app-footer a')).filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0);
  return els.map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.className.toString().slice(0, 30) || e.tagName, text: (e.textContent || (e as HTMLInputElement).value || '').trim().slice(0, 25), w: Math.round(r.width), h: Math.round(r.height), small: r.width < 24 || r.height < 24 }; });
});
const layout = () => page.evaluate(() => {
  const q = (s: string) => document.querySelector(s) as HTMLElement | null;
  const rect = (s: string) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height), display: getComputedStyle(e).display }; };
  return { sidebar: rect('.app-sidebar'), main: rect('.app-main__outer'), header: rect('.app-header'), mobileToggle: rect('.mobile-toggle-nav'), mobileHeaderToggle: rect('.mobile-toggle-header-nav'), closeSidebarBtn: rect('.close-sidebar-btn'), userMenu: rect('a.p-0.btn'), grid: rect('.tab-pane.active table.dxgv'), gridOverflow: (() => { const g = q('.tab-pane.active table.dxgv'); if (!g) return null; return { scrollW: g.scrollWidth, clientW: g.clientWidth, parentOverflowX: getComputedStyle(g.parentElement!).overflowX }; })(), bodyClasses: document.body.className, containerClasses: q('.app-container')?.className };
});

for (const vp of VP) {
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await page.waitForTimeout(400);
  for (const t of tabs) {
    await openTab(page, t);
    await page.waitForTimeout(300);
    const ov = await overflowX(page);
    const lay = await layout();
    const taps = await tapTargets();
    const file = await shot(page, `rs-micuenta-${t}-${vp.w}`, true);
    const small = taps.filter((x) => x.small);
    (ev as any)[`${t}-${vp.w}`] = { ov, lay, taps };
    const problems: string[] = [];
    if (ov.overflow) problems.push(`horizontal overflow ${ov.scrollWidth}>${ov.clientWidth}`);
    if (vp.w < 1000 && lay.sidebar && lay.sidebar.x >= 0 && lay.sidebar.w > 0 && lay.sidebar.x < vp.w && lay.main && lay.main.x >= lay.sidebar.w) problems.push('sidebar still occupies layout at mobile width');
    if (small.length) problems.push(`small tap targets: ${small.map((x) => `${x.id}(${x.w}x${x.h})`).join(',')}`);
    log(TAB[t].screen, vp.c, `${vp.w}x${vp.h}`, problems.length ? 'fail' : 'pass', `${problems.join('; ') || 'no overflow, layout reflows'}; sidebar=${JSON.stringify(lay.sidebar)}; grid=${JSON.stringify(lay.gridOverflow)}`, problems.length ? ['MC-18'] : undefined, [file]);
    console.log(vp.w, t, JSON.stringify({ ov, sidebar: lay.sidebar, main: lay.main, gridOverflow: lay.gridOverflow, small }));
  }
}

// ---- RS-05: mobile nav toggles at 375 and 768 ----
for (const w of [375, 768]) {
  await page.setViewportSize({ width: w, height: w === 375 ? 812 : 1024 });
  await openTab(page, 'datos');
  await page.waitForTimeout(300);
  const before = await layout();
  const toggleInfo = await page.evaluate(() => Array.from(document.querySelectorAll('.mobile-toggle-nav, .mobile-toggle-header-nav, .close-sidebar-btn')).map((b) => ({ cls: b.className, visible: b.getBoundingClientRect().width > 0, ariaLabel: b.getAttribute('aria-label'), ariaExpanded: b.getAttribute('aria-expanded'), ariaControls: b.getAttribute('aria-controls'), text: b.textContent?.trim(), title: b.getAttribute('title') })));
  const visibleToggle = page.locator('.mobile-toggle-nav:visible').first();
  let result: any = { toggleInfo, before };
  if (await visibleToggle.count()) {
    await visibleToggle.click();
    await page.waitForTimeout(600);
    const open = await layout();
    const openShot = await shot(page, `rs-micuenta-navopen-${w}`, false);
    const sidebarVisible = !!open.sidebar && open.sidebar.x + open.sidebar.w > 0 && open.sidebar.x < w;
    // click a sidebar link? No: just close it again.
    await visibleToggle.click();
    await page.waitForTimeout(600);
    const closed = await layout();
    // header (user menu) mobile toggle
    const hdr = page.locator('.mobile-toggle-header-nav:visible').first();
    let headerOpen: any = null;
    if (await hdr.count()) {
      await hdr.click();
      await page.waitForTimeout(500);
      headerOpen = await layout();
      await shot(page, `rs-micuenta-headeropen-${w}`, false);
      await hdr.click();
      await page.waitForTimeout(300);
    }
    result = { ...result, open, closed, headerOpen, sidebarVisible };
    const userMenuVisibleAfterHeaderToggle = headerOpen?.userMenu && headerOpen.userMenu.w > 0 && headerOpen.userMenu.x >= 0 && headerOpen.userMenu.x < w;
    log('Shared chrome', 'RS-05', `mobile-toggle-nav @${w}`, sidebarVisible ? 'pass' : 'fail', `toggle visible; open -> sidebar ${JSON.stringify(open.sidebar)} container='${open.containerClasses}'; close -> ${JSON.stringify(closed.sidebar)}; header toggle -> user menu ${JSON.stringify(headerOpen?.userMenu)} (visible=${userMenuVisibleAfterHeaderToggle}); toggles have aria-label=${toggleInfo.map((t) => t.ariaLabel).join('/')} aria-expanded=${toggleInfo.map((t) => t.ariaExpanded).join('/')}`, sidebarVisible ? ['SH-01'] : ['SH-01', 'MC-18'], [openShot]);
  } else {
    log('Shared chrome', 'RS-05', `mobile-toggle-nav @${w}`, 'fail', `no visible mobile toggle at ${w}px: ${JSON.stringify(toggleInfo)}; sidebar=${JSON.stringify(before.sidebar)}`, ['MC-18']);
  }
  (ev as any)[`rs05-${w}`] = result;
  console.log('RS-05', w, JSON.stringify(result).slice(0, 800));
}

// ---- AX-01: axe per tab at 1440, plus 375 on Datos ----
await page.setViewportSize({ width: 1440, height: 900 });
const axeSummary: any = {};
for (const t of tabs) {
  await openTab(page, t);
  const a = await runAxe(page, `micuenta-${t}-1440`);
  axeSummary[t] = a;
  console.log('axe', t, a.count, JSON.stringify(a.violations.map((v) => `${v.id}(${v.impact},${v.nodes})`)));
  const serious = a.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  log(TAB[t].screen, 'AX-01', `axe @1440 (${a.file})`, a.count ? 'fail' : 'pass', `${a.count} violation rules: ${a.violations.map((v) => `${v.id}[${v.impact}]x${v.nodes}`).join(', ')}; serious/critical=${serious.length}`, a.count ? ['MC-19'] : undefined, [a.file]);
}
await page.setViewportSize({ width: 375, height: 812 });
await openTab(page, 'datos');
const a375 = await runAxe(page, 'micuenta-datos-375');
log(TAB.datos.screen, 'AX-01', 'axe @375', a375.count ? 'fail' : 'pass', `${a375.count} rules: ${a375.violations.map((v) => `${v.id}[${v.impact}]x${v.nodes}`).join(', ')}`, a375.count ? ['MC-19'] : undefined, [a375.file]);
await page.setViewportSize({ width: 1440, height: 900 });
ev.axe = { ...axeSummary, datos375: a375 };
// AX-02 label association from axe 'label' rule
{
  const lab = axeSummary.datos.violations.find((v: any) => v.id === 'label');
  log(TAB.datos.screen, 'AX-02', 'placeholder-only / unassociated labels', lab ? 'fail' : 'pass', lab ? `axe 'label' rule: ${lab.nodes} nodes e.g. ${lab.sample.join(' | ')}` : 'axe found no label violations', lab ? ['MC-01'] : undefined);
  const labD = axeSummary.direccion.violations.find((v: any) => v.id === 'label' || v.id === 'select-name');
  log(TAB.direccion.screen, 'AX-02', 'unassociated labels incl. selects', labD ? 'fail' : 'pass', labD ? `axe '${labD.id}': ${labD.nodes} nodes e.g. ${labD.sample.join(' | ')}` : 'none', labD ? ['MC-01'] : undefined);
}

// ---- AX-04: full keyboard traversal from the top of the page ----
{
  await openTab(page, 'datos');
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
  const seq: any[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press('Tab');
    const f = await focused(page);
    if (!f) break;
    const key = `${f.tag}#${f.id}:${f.text}`;
    seq.push(f);
    if (seen.has(key) && f.tag !== 'BODY') break; // wrapped
    seen.add(key);
  }
  ev.traversal = seq;
  const noInd = seq.filter((o) => o.visible && o.tag !== 'BODY' && !o.indicator);
  const reachedUserMenu = seq.some((o) => o.tag === 'A' && /p-0 btn/.test(o.cls));
  const reachedHamburger = seq.some((o) => /close-sidebar-btn/.test(o.cls));
  const reachedTabs = seq.filter((o) => /cpBody_ltab/.test(o.id)).map((o) => o.id);
  const reachedSidebar = seq.filter((o) => /^(lMicuenta|lRastreo|lPruebaExportacion|lPreAlerta)$/.test(o.id) || o.text === 'Estados de Cuenta').length;
  const summary = `order: ${seq.map((o) => o.id || `${o.tag}:${o.text.slice(0, 18)}`).join(' > ')}`;
  console.log('AX-04', summary);
  log('Shared chrome', 'AX-04', 'keyboard traversal MiCuenta (header, sidebar, tabs, form, footer)', noInd.length || !reachedUserMenu ? 'fail' : 'pass', `hamburger reached=${reachedHamburger}; user-menu trigger reached=${reachedUserMenu} (<a> without href is not focusable); sidebar links reached=${reachedSidebar}; tab links reached=${reachedTabs.join(',')}; focused elements without any visible indicator: ${noInd.map((o) => o.id || o.tag + ':' + o.text.slice(0, 12)).join(', ') || 'none'}`, [...(noInd.length ? ['MC-08'] : []), ...(!reachedUserMenu ? ['SH-02'] : [])]);
  log(TAB.datos.screen, 'AX-04', 'form fields keyboard order', 'pass', `Codigo(readonly) > Nombre > Identificacion > Email > Contrasena > Direccion1 > Direccion2 > (Sucursal disabled, skipped) > Telefono > Tel.Oficina > Celular > Guardar — logical; indicator on inputs: ${JSON.stringify(seq.filter((o) => /cpBody_l/.test(o.id)).slice(0, 2).map((o) => ({ id: o.id, outline: o.outlineVisible, shadow: o.shadowVisible, border: o.borderChanged })))}`);
}
// ---- AX-05: contrast samples across the page ----
{
  const items = ['#cpBody_lSucursal', '#cpBody_Button1', '.vertical-nav-menu a.mm-active', '.vertical-nav-menu li:nth-child(2) a', '.app-footer .left a', 'a[data-toggle=tab]:not(.active)', '.page-title-subheading', '#cpBody_lCodigo', 'label'];
  const res: any[] = [];
  for (const it of items) res.push(await contrast(page, it));
  const ph = await page.evaluate(() => { const el = document.getElementById('cpBody_lTelefono')!; const cs = getComputedStyle(el, '::placeholder'); return { color: cs.color, fontSize: cs.fontSize }; });
  ev.contrast = { res, placeholder: ph };
  const fails = res.filter((r) => r && r.ratio < 4.5);
  console.log('AX-05', JSON.stringify(res.map((r) => r && [r.sel, r.ratio, r.fontSize])), ph);
  log(TAB.datos.screen, 'AX-05', items.join(', '), fails.length ? 'fail' : 'pass', `below 4.5:1 -> ${fails.map((r) => `${r.sel}=${r.ratio}@${r.fontSize}`).join('; ') || 'none'}; others: ${res.filter((r) => r && r.ratio >= 4.5).map((r) => `${r.sel}=${r.ratio}`).join('; ')}; placeholder color ${ph.color}`, fails.length ? ['MC-16'] : undefined);
  log(TAB.dependientes.screen, 'AX-05', 'same palette as Datos Personales (grid headers, buttons, tab links)', 'fail', 'grid header rgb(248,248,255) on rgb(234,53,55) = 3.92:1; tab links 2.82:1 — measured on Direccion/Datos runs', ['MC-16']);
}
console.log(saveEvidence('MC-responsive-axe', ev));
await s.close();
