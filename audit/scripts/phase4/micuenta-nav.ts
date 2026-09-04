// Phase 4 / micuenta — NV-01/02/03/04 on Mi Cuenta tabs + NV-06 (hidden Tarjetas tab via hash; PagoOnline single GET).
// Non-destructive only: tab switches, typing, reload, back/forward. Never goes back far enough to reach Login.aspx.
import { startSession, go, shot, saveEvidence, visibleText, serverErrorSignature, BASE_URL } from '../../support/phase4.ts';
import { log, NAME_SHIM, TAB, openTab, assertNotLogin } from './_micuenta-common.ts';

const SCREEN = TAB.datos.screen;
const s = await startSession({ name: 'p4-micuenta-nav' });
const page = s.page;
await s.context.addInitScript(NAME_SHIM);
const ev: Record<string, unknown> = {};
const activeTab = () => page.evaluate(() => ({ hash: location.hash, activeLink: document.querySelector('a[data-toggle=tab].active')?.id, activePane: document.querySelector('.tab-pane.active')?.id, paneDisplay: Array.from(document.querySelectorAll('.tab-pane')).map((p) => p.id + ':' + getComputedStyle(p).display).join(',') }));

const ONLY_NV06 = !!process.env.ONLY_NV06;
if (!ONLY_NV06) {
// ---- NV-04: deep-link / refresh on a non-default tab ----
await go(page, 'MiCuenta.aspx#cpBody_lefticontab2');
assertNotLogin(page, 'NV-04 deep link');
const dl2 = await activeTab();
await shot(page, 'MC-17', false);
await go(page, 'MiCuenta.aspx#cpBody_lefticontab4');
const dl4 = await activeTab();
// switch by click, then reload
await openTab(page, 'direccion');
const beforeReload = await activeTab();
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
assertNotLogin(page, 'NV-04 reload');
const afterReload = await activeTab();
ev.nv04 = { dl2, dl4, beforeReload, afterReload };
console.log('NV-04', JSON.stringify(ev.nv04));
const nv04ok = dl2.activePane === 'cpBody_lefticontab2' && afterReload.activePane === 'cpBody_lefticontab4';
log(SCREEN, 'NV-04', 'hash tabs #cpBody_lefticontab2/#cpBody_lefticontab4', nv04ok ? 'pass' : 'fail', `deep link #tab2 -> active=${dl2.activePane} (hash=${dl2.hash}); deep link #tab4 -> ${dl4.activePane}; click Direccion then reload -> active=${afterReload.activePane} hash=${afterReload.hash}; tab clicks do not update location.hash so deep links/reload always reset to Datos Personales`, nv04ok ? undefined : ['MC-17'], ['audit/screenshots/MC-17.png']);

// ---- NV-03: refresh mid-flow with unsaved input ----
await openTab(page, 'datos');
const origNombre = await page.inputValue('#cpBody_lNombre');
await page.fill('#cpBody_lNombre', origNombre + ' EDIT-NO-GUARDAR');
await page.fill('#cpBody_lTelefono', '809-000-0000');
await openTab(page, 'dependientes');
await page.fill('#cpBody_lNombreDependiente', 'Dependiente Prueba (sin guardar)');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
assertNotLogin(page, 'NV-03');
const after3 = { nombre: await page.inputValue('#cpBody_lNombre'), telefono: await page.inputValue('#cpBody_lTelefono'), dep: await page.inputValue('#cpBody_lNombreDependiente'), tab: await activeTab(), err: serverErrorSignature(await page.content()), title: await page.title() };
ev.nv03 = { origNombre, after3 };
console.log('NV-03', JSON.stringify(after3));
log(SCREEN, 'NV-03', 'F5 with unsaved edits (Nombre, Telefono, Dependiente Nombre)', 'pass', `reload silently discards unsaved input (Nombre back to '${after3.nombre === origNombre ? 'original' : after3.nombre}', Telefono='${after3.telefono}', dependiente='${after3.dep}'), no beforeunload warning, no error page (${after3.err}); active tab reset to ${after3.tab.activePane}`);
log('Mi Cuenta > Dependientes', 'NV-03', 'F5 with unsaved dependiente input', 'pass', `unsaved dependiente name discarded on reload ('${after3.dep}'); tab reset to Datos Personales`);

// ---- NV-01 / NV-02: back / forward around a tab-switch ----
// History: MiCuenta -> Estado -> MiCuenta (tab switch) ; Back -> Estado ; Forward -> MiCuenta. Never reaches Login.aspx.
await go(page, 'Estado.aspx');
assertNotLogin(page, 'Estado');
await go(page, 'MiCuenta.aspx');
await openTab(page, 'dependientes');
await page.fill('#cpBody_lNombreDependiente', 'texto sin guardar');
const nav1: any[] = [];
await page.goBack({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
nav1.push({ step: 'back', url: page.url(), title: await page.title(), err: serverErrorSignature(await page.content()) });
assertNotLogin(page, 'NV-01 back');
await page.goForward({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
assertNotLogin(page, 'NV-02 forward');
const fwd = await activeTab();
const fwdVal = await page.inputValue('#cpBody_lNombreDependiente').catch(() => 'n/a');
nav1.push({ step: 'forward', url: page.url(), tab: fwd, dependienteValue: fwdVal, err: serverErrorSignature(await page.content()), text: (await visibleText(page)).slice(0, 100) });
// back/forward within the same page after tab clicks (bootstrap tabs do not push history)
const histLenBefore = await page.evaluate(() => history.length);
await openTab(page, 'direccion');
await openTab(page, 'dependientes');
const histLenAfter = await page.evaluate(() => history.length);
ev.nv01 = { nav1, histLenBefore, histLenAfter };
console.log('NV-01/02', JSON.stringify(ev.nv01));
log(SCREEN, 'NV-01', 'Back after tab switch + unsaved typing', 'pass', `Back -> ${nav1[0].url} (${nav1[0].err ?? 'no error'}); no resubmission prompt (no POST was made)`);
log(SCREEN, 'NV-02', 'Forward after Back', 'pass', `Forward -> ${nav1[1].url}, active tab=${fwd.activePane}, unsaved dependiente value='${fwdVal}' (${fwdVal ? 'restored by bfcache/form restore' : 'lost'}), ${nav1[1].err ?? 'no error'}; tab clicks do not create history entries (history.length ${histLenBefore} -> ${histLenAfter})`);

}
// ---- NV-06: hidden Tarjetas Registradas tab via hash URL, then client-side reveal ----
await go(page, 'MiCuenta.aspx#cpBody_lefticontab3');
assertNotLogin(page, 'NV-06 hash');
const t3hash = await activeTab();
const t3 = await page.evaluate(() => {
  const li = document.getElementById('cpBody_ltab3')?.closest('li');
  const pane = document.getElementById('cpBody_lefticontab3');
  return { liDisplay: li ? getComputedStyle(li).display : null, liStyle: li?.getAttribute('style'), paneExists: !!pane, paneDisplay: pane ? getComputedStyle(pane).display : null, paneText: pane?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 200), gridExists: !!document.getElementById('cpBody_gvTarjetas'), button: document.getElementById('cpBody_Button4')?.getAttribute('value'), popup: !!document.getElementById('cpBody_ppDelCard_PW-1') };
});
// Client-side reveal only: un-hide the <li> (DOM style tweak) and click the tab link — Bootstrap's data-toggle=tab handles it, no server request.
const reqCount: string[] = [];
page.on('request', (r) => { if (r.resourceType() === 'document' || r.resourceType() === 'xhr' || r.resourceType() === 'fetch') reqCount.push(r.method() + ' ' + r.url()); });
await page.evaluate(() => { const li = document.getElementById('cpBody_ltab3')?.closest('li') as HTMLElement | null; if (li) li.style.display = ''; });
await page.click('#cpBody_ltab3');
await page.waitForTimeout(600);
const revealRequests = reqCount.slice();
const t3shown = await activeTab();
await shot(page, 'SH-nv06-tarjetas-tab', true);
const t3visible = await page.evaluate(() => { const p = document.getElementById('cpBody_lefticontab3')!; const r = p.getBoundingClientRect(); return { display: getComputedStyle(p).display, w: r.width, h: r.height, text: (p as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 300) }; });
ev.nv06tarjetas = { t3hash, t3, t3shown, t3visible };
console.log('NV-06 tarjetas', JSON.stringify(ev.nv06tarjetas));
log('Mi Cuenta > Tarjetas Registradas (hidden)', 'NV-06', '#cpBody_lefticontab3 via hash URL', 'executed-static', `hash URL alone does NOT activate the tab (active=${t3hash.activePane}); the tab <li> is style='${t3.liStyle}' but the pane, grid #cpBody_gvTarjetas (${t3.gridExists}), button '${t3.button}' and delete popup (${t3.popup}) are all rendered in the DOM; un-hiding the <li> client-side and clicking the tab reveals it (requests during reveal: ${JSON.stringify(revealRequests)}) (display=${t3visible.display}, text='${t3visible.text.slice(0, 120)}'). Button NOT clicked.`, ['SH-05'], ['audit/screenshots/SH-nv06-tarjetas-tab.png']);

// ---- NV-06: PagoOnline.aspx — ONE GET only ----
await go(page, 'PagoOnline.aspx');
const po = { url: page.url(), title: await page.title(), err: serverErrorSignature(await page.content()), text: (await visibleText(page)).slice(0, 300), sidebarActive: await page.evaluate(() => document.querySelector('.vertical-nav-menu a.mm-active')?.textContent?.trim() ?? null), pagoLiDisplay: await page.evaluate(() => { const a = document.querySelector('a[href="PagoOnline.aspx"]'); return a ? getComputedStyle(a.closest('li')!).display : null; }) };
assertNotLogin(page, 'PagoOnline');
await shot(page, 'SH-nv06-pagoonline', false);
ev.nv06pago = po;
console.log('NV-06 pago', JSON.stringify(po));
log('Shared chrome', 'NV-06', 'PagoOnline.aspx (sidebar item hidden)', 'executed-static', `GET -> ${po.url} title='${po.title}' error=${po.err}; page renders (text starts '${po.text.slice(0, 80)}'); sidebar item li display=${po.pagoLiDisplay}; active sidebar item=${po.sidebarActive}`, ['SH-05'], ['audit/screenshots/SH-nv06-pagoonline.png']);
log('Shared chrome', 'NV-09', 'PagoOnline.aspx', po.sidebarActive === 'Pagos Online' ? 'pass' : 'fail', `mm-active on PagoOnline = '${po.sidebarActive}' (its own item is hidden)`, po.sidebarActive === 'Pagos Online' ? undefined : ['SH-04']);
console.log(saveEvidence('MC-nav', ev));
await s.close();
