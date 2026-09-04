// Phase 4 / micuenta (shared chrome) — NV-09 sidebar active state on every visible sidebar screen (PagoOnline handled in micuenta-nav.ts).
import { startSession, go, shot, saveEvidence } from '../../support/phase4.ts';
import { log, NAME_SHIM, assertNotLogin } from './_micuenta-common.ts';

const s = await startSession({ name: 'p4-shared-nv09' });
const page = s.page;
await s.context.addInitScript(NAME_SHIM);
const screens = [
  { url: 'MiCuenta.aspx', expect: 'Mi Cuenta' },
  { url: 'Estado.aspx', expect: 'Estados de Cuenta' },
  { url: 'Rastreo.aspx', expect: 'Rastreo' },
  { url: 'PruebaExportacion.aspx', expect: 'Prueba de Exportacion' },
  { url: 'PreAlerta.aspx', expect: 'PreAlerta' },
];
const results: any[] = [];
// Navigate by clicking the sidebar links (real user path), starting from MiCuenta.
await go(page, 'MiCuenta.aspx');
for (const sc of screens) {
  if (sc.url !== 'MiCuenta.aspx') {
    await page.click(`.vertical-nav-menu a[href="${sc.url}"]`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(700);
  }
  assertNotLogin(page, sc.url);
  const st = await page.evaluate(() => ({
    url: location.pathname,
    active: Array.from(document.querySelectorAll('.vertical-nav-menu a.mm-active, .vertical-nav-menu li.mm-active > a')).map((a) => a.textContent?.trim()),
    activeCount: document.querySelectorAll('.vertical-nav-menu .mm-active').length,
    ariaCurrent: Array.from(document.querySelectorAll('.vertical-nav-menu a[aria-current]')).map((a) => a.textContent?.trim()),
    heading: document.querySelector('.page-title-heading')?.textContent?.replace(/\s+/g, ' ').trim(),
    title: document.title,
    lang: document.documentElement.lang,
    footerYear: document.querySelector('.app-footer')?.textContent?.match(/20\d\d/)?.[0],
    hamburgerNames: Array.from(document.querySelectorAll('.close-sidebar-btn, a.p-0.btn')).map((b) => b.getAttribute('aria-label') || b.textContent?.trim() || ''),
    pagoHidden: (() => { const a = document.querySelector('a[href="PagoOnline.aspx"]'); return a ? getComputedStyle(a.closest('li')!).display : 'missing'; })(),
  }));
  results.push({ expect: sc.expect, ...st });
  const ok = st.active.length === 1 && st.active[0] === sc.expect;
  log('Shared chrome', 'NV-09', sc.url, ok ? 'pass' : 'fail', `mm-active=${JSON.stringify(st.active)} (count=${st.activeCount}) expected '${sc.expect}'; aria-current=${JSON.stringify(st.ariaCurrent)}; heading='${st.heading}'; title='${st.title}'`, ok ? undefined : ['SH-04']);
  console.log(sc.url, JSON.stringify(st));
}
await shot(page, 'SH-nv09-prealerta', false);
console.log(saveEvidence('SH-nv09', results));
await s.close();
