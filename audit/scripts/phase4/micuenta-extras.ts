// Phase 4 / micuenta — finding screenshots by id + small extra checks (avatar image, hidden controls, TokenID field). Read-only.
import { startSession, go, shot, saveEvidence } from '../../support/phase4.ts';
import { NAME_SHIM, openTab, assertNotLogin, log } from './_micuenta-common.ts';

const s = await startSession({ name: 'p4-micuenta-extras' });
const page = s.page;
await s.context.addInitScript(NAME_SHIM);
await go(page, 'MiCuenta.aspx');
assertNotLogin(page, 'start');

const clip = async (sel: string, name: string, pad = 16) => {
  const box = await page.$eval(sel, (el, pad) => { const r = el.getBoundingClientRect(); return { x: Math.max(0, r.x - pad), y: Math.max(0, r.y + window.scrollY - pad), width: r.width + pad * 2, height: r.height + pad * 2 }; }, pad);
  await page.screenshot({ path: `audit/screenshots/${name}.png`, clip: box, fullPage: true });
  return `audit/screenshots/${name}.png`;
};
const extras: Record<string, unknown> = {};

// Datos Personales shots
await shot(page, 'MC-01', true); // labels (whole form)
await clip('#cpBody_lefticontab1 .col-md-6:nth-child(2) fieldset', 'MC-02'); // Codigo? Sucursal is in the right column
await clip('#cpBody_lefticontab1', 'MC-03');
await clip('#cpBody_lContrasena', 'MC-04', 40);
await clip('#cpBody_Button1', 'MC-05', 60);
await shot(page, 'MC-06', false);
await shot(page, 'MC-09', false);
await clip('.app-header', 'SH-02', 4);
await clip('.app-header', 'SH-01', 4);
await clip('.nav-tabs', 'MC-16', 8);
// Extra checks on the header
extras.avatar = await page.$eval('a.p-0.btn img', (img) => ({ src: (img as HTMLImageElement).src, naturalWidth: (img as HTMLImageElement).naturalWidth, complete: (img as HTMLImageElement).complete, alt: img.getAttribute('alt'), rendered: img.getBoundingClientRect().width }));
extras.hidden = await page.evaluate(() => ['cpBody_lIdentificacion', 'cpBody_ckConsolidation', 'cpBody_lCupon', 'cpBody_BVerificar', 'cpBody_Button2', 'cpBody_Button6', 'cpBody_Button4', 'SetCliente', 'lsClienteID', 'cpBody_TokenID', 'cpBody_ClienteID', 'cpBody_DireccionID', 'cpBody_DependienteId', 'cpBody_bGuardarClientes', 'cpBody_BGuardarDependientes', 'cpBody_bEditar', 'cpBody_BEliminar1'].map((id) => { const el = document.getElementById(id) as HTMLInputElement | null; return { id, exists: !!el, type: el?.type, value: el ? (id === 'cpBody_TokenID' || id === 'cpBody_ClienteID' ? el.value : (el.type === 'submit' ? el.value : (el.value ? '<non-empty>' : ''))) : null, hiddenBy: el ? (el.style.display === 'none' ? 'own style' : (el.closest('[style*="display: none"], [style*="display:none"]') ? 'ancestor style' : 'visible?')) : null }; }));
extras.mixedContent = await page.evaluate(() => Array.from(document.scripts).map((s) => s.src).filter((u) => u.startsWith('http://')));
extras.llocalidad = await page.evaluate(() => { const e = document.getElementById('llocalidad'); if (!e) return null; const r = e.getBoundingClientRect(); return { text: e.textContent?.trim(), tag: e.tagName, visible: r.width > 0, color: getComputedStyle(e).color, parent: e.parentElement?.className }; });
extras.metaViewport = await page.evaluate(() => document.querySelector('meta[name=viewport]')?.getAttribute('content'));
console.log(JSON.stringify(extras, null, 1));

// Dependientes
await openTab(page, 'dependientes');
await clip('#cpBody_lCelularDependiente', 'MC-10', 40);
await clip('#cpBody_gvDependientes', 'MC-11', 12);
await clip('#cpBody_gvDependientes', 'MC-12', 12);
// Direccion
await openTab(page, 'direccion');
await clip('#cpBody_lefticontab4', 'MC-13', 8);
await clip('#cpBody_lefticontab4', 'MC-14', 8);
await shot(page, 'MC-19', true);
// Estado.aspx active-state screenshot for SH-04
await go(page, 'Estado.aspx');
assertNotLogin(page, 'Estado');
await clip('.app-sidebar', 'SH-04', 4);
extras.estadoActive = await page.evaluate(() => Array.from(document.querySelectorAll('.vertical-nav-menu .mm-active')).map((e) => e.textContent?.trim()));
// SH-06 sidebar collapse not persisted (already measured in shared-chrome; screenshot only)
await page.click('.close-sidebar-btn:visible');
await page.waitForTimeout(500);
await go(page, 'MiCuenta.aspx');
await shot(page, 'SH-06', false);
extras.collapsedAfterNav = await page.evaluate(() => document.querySelector('.app-container')?.className);
console.log(saveEvidence('MC-extras', extras));
log('Shared chrome', 'BT-06', 'user-menu avatar <img alt="">', extras.avatar && (extras.avatar as any).naturalWidth > 0 ? 'pass' : 'fail', `avatar img naturalWidth=${(extras.avatar as any).naturalWidth} complete=${(extras.avatar as any).complete} alt='${(extras.avatar as any).alt}' src=${(extras.avatar as any).src.slice(0, 60)}…`, ['SH-02']);
await s.close();
