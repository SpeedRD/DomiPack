// Phase 4 — NuevaCuenta.aspx (public registration). NON-DESTRUCTIVE:
//  * every POST to NuevaCuenta.aspx is aborted at the network layer (route) — backstop;
//  * #bSend is only ever clicked when form.checkValidity() === false (browser blocks the submit);
//  * WebService1.asmx lookups (fired by onblur of #Identificacion) are allowed only with obviously bogus values, otherwise aborted.
// Fields disabled on load are enabled by replicating what the GetDataCliente success callback does (removeAttribute('disabled')).
import { Page } from 'playwright';
import { startSession, shot, logCase, saveEvidence, saveText, visibleText, BASE_URL, LONG_5K, LONG_100K, SPECIALS, XSS_PROBE, UNICODE, SQLISH, EMAIL_INVALID } from '../../support/phase4.ts';

const GROUP = 'login';
const SCREEN = 'Nueva Cuenta';
const URL_NC = `${BASE_URL}/NuevaCuenta.aspx`;

const s = await startSession({ name: 'p4-nueva-cuenta-selects', auth: false });
const page = s.page;

const blockedPosts: any[] = [];
const asmxCalls: any[] = [];
let allowAsmx = false;
await s.context.route('**/*', async (route) => {
  const req = route.request();
  const url = req.url();
  if (/NuevaCuenta\.aspx/i.test(url) && req.method() === 'POST') {
    const pd = req.postData() || '';
    blockedPosts.push({ url, ts: new Date().toISOString(), keys: Array.from(new URLSearchParams(pd).keys()) });
    console.log('!!! BLOCKED POST to NuevaCuenta.aspx (backstop)');
    return route.abort('blockedbyclient');
  }
  if (/WebService1\.asmx/i.test(url)) {
    const rec = { url, method: req.method(), postData: (req.postData() || '').replace(/TokenID=[^&]*/, 'TokenID=<redacted>'), allowed: allowAsmx, ts: new Date().toISOString() };
    asmxCalls.push(rec);
    if (!allowAsmx) return route.abort('blockedbyclient');
  }
  return route.continue();
});
page.on('response', async (r) => {
  if (/WebService1\.asmx/i.test(r.url())) {
    const body = await r.text().catch(() => '');
    const rec = asmxCalls.find((c) => c.url === r.url() && !c.status);
    if (rec) { rec.status = r.status(); rec.body = body.slice(0, 500); }
    console.log('ASMX response', r.status(), r.url().slice(-40), body.slice(0, 200).replace(/\s+/g, ' '));
  }
});
page.on('dialog', async (d) => { dialogs.push({ type: d.type(), message: d.message() }); await d.dismiss().catch(() => {}); });
const dialogs: any[] = [];

async function load() {
  await page.goto(URL_NC, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
}
const ENABLE_JS = `['tbFecha','Email','tbContacto','ltelefono','lcelular','Password'].forEach(function(id){ var e=document.getElementById(id); if(e) e.removeAttribute('disabled'); })`;
async function enableFields() { await page.evaluate(ENABLE_JS); }
async function formValidity() {
  return page.evaluate(`(() => { var f = document.forms[0]; var inv = Array.from(f.elements).filter(function (e) { return e.willValidate && !e.validity.valid; }).map(function (e) { return { id: e.id, valueMissing: e.validity.valueMissing, typeMismatch: e.validity.typeMismatch, msg: e.validationMessage }; }); return { valid: f.checkValidity(), invalid: inv }; })()`) as Promise<{ valid: boolean; invalid: any[] }>;
}
/** Clicks #bSend ONLY when the browser will block the submit (form invalid). */
async function safeClickSend(label: string) {
  const v = await formValidity();
  if (v.valid) {
    console.log(`[${label}] form is VALID -> NOT clicking #bSend (would submit)`);
    return { clicked: false, wouldSubmit: true, validity: v, active: '', blocked: blockedPosts.length };
  }
  const before = blockedPosts.length;
  await page.click('#bSend');
  await page.waitForTimeout(700);
  const active = await page.evaluate(`document.activeElement ? document.activeElement.id : ''`);
  const text = await visibleText(page);
  return { clicked: true, wouldSubmit: false, validity: v, active, blocked: blockedPosts.length - before, textHasMessage: /obligatorio|requerido|required|complete/i.test(text) };
}
async function fillValidCore() {
  await page.fill('#Nombre', 'Prueba Auditoria');
  await page.fill('#Email', 'auditoria@example.com');
  await page.fill('#Email1', 'auditoria@example.com');
}

// ---------- DR-08 (#tbFecha enabled) ----------
{
  await load();
  await enableFields();
  const dt = async (v: string) => { await page.evaluate(`(() => { var e = document.getElementById('tbFecha'); e.value = ''; e.value = '${v}'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); })()`); return page.evaluate(`(() => { var e = document.getElementById('tbFecha'); return { value: e.value, valid: e.validity.valid, min: e.min, max: e.max, rangeOverflow: e.validity.rangeOverflow }; })()`) as Promise<any>; };
  const today = new Date().toISOString().slice(0, 10);
  const rows = [{ input: '2035-01-01', ...(await dt('2035-01-01')) }, { input: today, ...(await dt(today)) }, { input: '1900-01-01', ...(await dt('1900-01-01')) }, { input: '2026-02-30', ...(await dt('2026-02-30')) }];
  const ev = saveEvidence('NC-09-dob', rows);
  const noPlaus = rows.slice(0, 3).every((r) => r.valid);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'DR-08', instance: '#tbFecha', result: noPlaus ? 'fail' : 'pass', findingIds: noPlaus ? ['NC-09'] : [], reason: JSON.stringify(rows.map((r) => `${r.input}=>valid:${r.valid},value:${r.value}`)) + ` min=${rows[0].min} max=${rows[0].max}`, evidence: [ev] });
}

// ---------- SL-01 / SL-02 / SL-03 / SL-05 / SL-06 / SL-07 ----------
{
  await load();
  const sel: any = await page.evaluate(`(() => { var o = {}; ['ddTipo','sSexo','lSucursal','cbMedioiD'].forEach(function (id) { var e = document.getElementById(id); o[id] = { required: e.required, value: e.value, selectedText: e.options[e.selectedIndex] ? e.options[e.selectedIndex].text : null, count: e.options.length, options: Array.from(e.options).map(function (x) { return x.value + '=' + x.text; }) }; }); return o; })()`);
  saveEvidence('nueva-cuenta-selects', sel);
  await fillValidCore();
  const v = await formValidity();
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-01', instance: '#sSexo', result: sel.sSexo.required ? 'pass' : 'fail', findingIds: ['NC-10'], reason: `required=${sel.sSexo.required}; placeholder "Seleccionar" value="${sel.sSexo.value}" pasaría como valor (form válido=${v.valid})` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-01', instance: '#cbMedioiD', result: 'fail', findingIds: ['NC-10'], reason: `required=${sel.cbMedioiD.required}; primera opción vacía value="${sel.cbMedioiD.value}" seleccionada por defecto` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-01', instance: '#lSucursal', result: 'executed-static', reason: `sin placeholder: "${sel.lSucursal.selectedText}" preseleccionada por defecto (selección silenciosa)` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-01', instance: '#ddTipo', result: 'executed-static', reason: `sin placeholder: "${sel.ddTipo.selectedText}" por defecto` });
  // SL-02 ddTipo gating
  const vis = async () => page.evaluate(`(() => { var q = function (id) { var e = document.getElementById(id); return e ? getComputedStyle(e).display !== 'none' : null; }; return { dCedula: q('dCedula'), dRnc: q('dRnc'), dRnc1: q('dRnc1'), DFechaNacimiento: q('DFechaNacimiento'), lrnc: (document.getElementById('lrnc') || {}).innerText, iRNCph: document.getElementById('iRNC').placeholder, tbFechaRequired: document.getElementById('tbFecha').hasAttribute('required'), identVisible: document.getElementById('Identificacion').offsetParent !== null }; })()`) as Promise<any>;
  const seq: any[] = [{ step: 'load(Personal)', ...(await vis()) }];
  for (const opt of ['Corporativo', 'Extranjero', 'Personal', 'Corporativo', 'Personal']) { await page.selectOption('#ddTipo', opt); await page.waitForTimeout(200); seq.push({ step: opt, ...(await vis()) }); }
  await page.selectOption('#ddTipo', 'Corporativo'); await shot(page, 'nueva-cuenta-SL-02-empresa');
  await page.selectOption('#ddTipo', 'Extranjero'); await shot(page, 'NC-11');
  const ev = saveEvidence('NC-11-ddTipo-sequence', seq);
  console.log('SL-02', JSON.stringify(seq));
  const extAfterCorp = seq[2];
  const bug = extAfterCorp.step === 'Extranjero' && extAfterCorp.DFechaNacimiento === false;
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-02', instance: '#ddTipo', result: bug ? 'fail' : 'pass', findingIds: bug ? ['NC-11'] : [], reason: `secuencia: ${seq.map((x) => `${x.step}:ced=${x.dCedula},rnc=${x.dRnc},contacto=${x.dRnc1},fecha=${x.DFechaNacimiento},lbl=${x.lrnc}`).join(' | ')}`, evidence: [ev, 'audit/screenshots/NC-11.png'] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-02', instance: '#sSexo', result: 'pass', reason: 'sin campos dependientes; opciones M/F seleccionables' });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-03', instance: '#lSucursal', result: 'fail', findingIds: ['NC-12'], reason: `${sel.lSucursal.count} opciones, select nativo sin búsqueda/agrupación` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-03', instance: '#cbMedioiD', result: 'fail', findingIds: ['NC-12'], reason: `${sel.cbMedioiD.count} opciones, select nativo sin búsqueda; opción vacía inicial` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-06', instance: '#cbMedioiD', result: 'fail', findingIds: ['NC-12'], reason: `copy: ${sel.cbMedioiD.options.slice(0, 60).join(' ; ').slice(0, 900)}`, evidence: ['audit/logs/evidence/nueva-cuenta-selects.json'] });
  // SL-07 inject value
  await load();
  await fillValidCore();
  await page.evaluate(`(() => { var e = document.getElementById('sSexo'); var o = document.createElement('option'); o.value = 'ZZ'; o.text = 'inyectado'; e.add(o); e.value = 'ZZ'; })()`);
  const v7 = await formValidity();
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-07', instance: '#sSexo (valor fuera de lista)', result: 'executed-static', reason: `valor inyectado "ZZ" -> form.checkValidity()=${v7.valid} (el navegador no valida opciones); NO se envió (STATIC-ONLY); la página incluye __EVENTVALIDATION (ASP.NET) que en teoría rechazaría el postback` });
  // SL-05 keyboard / BT-11 tab order
  await load();
  await page.evaluate(`(document.activeElement || {}).blur && document.activeElement.blur()`);
  const order: any[] = [];
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(`(() => { var el = document.activeElement; var cs = getComputedStyle(el); return { id: el.id, tag: el.tagName, tabindex: el.getAttribute('tabindex'), text: (el.value || el.textContent || '').toString().trim().slice(0, 20), outline: cs.outlineStyle + ' ' + cs.outlineWidth, boxShadow: cs.boxShadow }; })()`));
  }
  const ev5 = saveEvidence('NC-13-tab-order', order);
  const ids = order.map((o) => o.id || o.tag);
  console.log('TAB', ids.join(' > '));
  const domOrder = ['ddTipo', 'Identificacion', 'Nombre', 'Password', 'sSexo', 'ltelefono', 'lcelular', 'Email', 'Email1', 'tbFecha', 'lSucursal', 'ckDomicilio', 'cbMedioiD', 'ckRua', 'bSend'];
  const visited = ids.filter((x) => domOrder.includes(x));
  const outOfOrder = visited.some((x, i) => i > 0 && domOrder.indexOf(x) < domOrder.indexOf(visited[i - 1]));
  logCase({ group: GROUP, screen: SCREEN, caseId: 'SL-05', instance: '#ddTipo/#sSexo/#lSucursal/#cbMedioiD', result: outOfOrder ? 'fail' : 'pass', findingIds: outOfOrder ? ['NC-13'] : [], reason: `orden Tab: ${ids.join(' > ')} (tabindex explícitos 1..10; sSexo/ckDomicilio/ckRua sin tabindex)`, evidence: [ev5] });
  const noRing = order.filter((o) => ['INPUT', 'SELECT'].includes(o.tag) && /none/.test(o.outline) && (o.boxShadow === 'none' || /rgba\(0, 0, 0, 0\)/.test(o.boxShadow)));
  await page.focus('#bSend'); await shot(page, 'nueva-cuenta-focus-bSend', false);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-11', instance: '#bSend y campos', result: outOfOrder || noRing.length ? 'fail' : 'pass', findingIds: ['NC-13'], reason: `outOfOrder=${outOfOrder}; controles sin anillo de foco visible: ${noRing.map((o) => o.id).join(',') || 'ninguno'}`, evidence: [ev5, 'audit/screenshots/nueva-cuenta-focus-bSend.png'] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'AX-04', instance: 'Nueva Cuenta (traversal)', result: outOfOrder ? 'fail' : 'pass', findingIds: outOfOrder ? ['NC-13'] : [], reason: `orden Tab: ${ids.join(' > ')}`, evidence: [ev5] });
}

// ---------- CB-01 (#ckDomicilio, #ckRua) ----------
{
  await load();
  const before: any = await page.evaluate(`(() => ({ dom: document.getElementById('ckDomicilio').checked, rua: document.getElementById('ckRua').checked, dir: getComputedStyle(document.getElementById('Ddireccion')).display, dirVisible: document.getElementById('Direccion').offsetParent !== null }))()`);
  await page.click('#ckDomicilio');
  await page.waitForTimeout(300);
  const after: any = await page.evaluate(`(() => ({ dom: document.getElementById('ckDomicilio').checked, dir: getComputedStyle(document.getElementById('Ddireccion')).display, dirVisible: document.getElementById('Direccion').offsetParent !== null, dirRequired: document.getElementById('Direccion').required, paisVisible: document.getElementById('cbPais').offsetParent !== null, provOptions: document.getElementById('cbProvincias').options.length }))()`);
  await shot(page, 'NC-02');
  await page.click('#ckRua');
  const rua: any = await page.evaluate(`(() => ({ rua: document.getElementById('ckRua').checked, handlers: (window.jQuery && jQuery._data ? Object.keys(jQuery._data(document.getElementById('ckRua'), 'events') || {}) : []) }))()`);
  await page.click('#ckDomicilio');
  const off: any = await page.evaluate(`getComputedStyle(document.getElementById('Ddireccion')).display`);
  const ev = saveEvidence('NC-02-checkboxes', { before, after, rua, offAgain: off });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'CB-01', instance: '#ckDomicilio', result: after.dirVisible && off === 'none' ? 'pass' : 'fail', findingIds: ['NC-02'], reason: `default=${before.dom}; al marcar muestra #Ddireccion (Direccion visible=${after.dirVisible}, required=${after.dirRequired}); cbPais visible=${after.paisVisible}, cbProvincias opciones=${after.provOptions}; desmarcar oculta=${off === 'none'}`, evidence: [ev, 'audit/screenshots/NC-02.png'] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'CB-01', instance: '#ckRua', result: 'fail', findingIds: ['NC-02'], reason: `default=${before.rua}; toggle libre por el usuario (checked=${rua.rua}) sin efecto visible ni explicación; lo fija VerificarRua() vía web service ("Rua Registrado")`, evidence: [ev] });
}

// ---------- BT-02 static: double-submit protection & confirm step (Confirmar with Guardar stubbed) ----------
{
  await load();
  const st: any = await page.evaluate(`(() => { var b = document.getElementById('bSend'); return { onclick: b.getAttribute('onclick'), disabledOnClickJS: Array.from(document.scripts).some(function (s) { return /bSend[^;]*disabled|disabled[^;]*bSend/.test(s.textContent); }), bsendConfiHidden: getComputedStyle(document.getElementById('bsendConfi')).display === 'none', hasConfirmar: typeof window.Confirmar, hasGuardar: typeof window.Guardar, swalVersion: (window.Swal && window.Swal.version) || null }; })()`);
  // Client-side test of Confirmar(): stub Guardar so nothing is submitted; dismiss with Esc and see whether Guardar runs.
  const warn: string[] = [];
  const onCons = (m: any) => { if (['warning', 'error'].includes(m.type())) warn.push(m.text().slice(0, 200)); };
  page.on('console', onCons);
  await page.evaluate(`(() => { window.__guardarCalls = 0; window.Guardar = function () { window.__guardarCalls++; }; window.__confirmErr = null; try { Confirmar('Titulo', 'Mensaje', 'info', 'Texto'); } catch (e) { window.__confirmErr = String(e); } })()`);
  await page.waitForTimeout(800);
  const dlg: any = await page.evaluate(`(() => { var c = document.querySelector('.swal2-container'); return { shown: !!c, text: c ? c.innerText.replace(/\\s+/g, ' ').trim() : '', buttons: Array.from(document.querySelectorAll('.swal2-actions button')).filter(function (b) { return getComputedStyle(b).display !== 'none'; }).map(function (b) { return b.innerText; }), err: window.__confirmErr }; })()`);
  await shot(page, 'NC-14');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  const afterEsc: any = await page.evaluate(`(() => ({ guardarCalls: window.__guardarCalls, swalStill: !!document.querySelector('.swal2-container'), swalText: (document.querySelector('.swal2-container') || { innerText: '' }).innerText.replace(/\\s+/g, ' ').trim(), err: window.__confirmErr }))()`);
  // second run: click the (only) confirm button
  await page.evaluate(`(() => { window.__guardarCalls = 0; try { Confirmar('Titulo', 'Mensaje', 'info', 'Texto'); } catch (e) { window.__confirmErr = String(e); } })()`);
  await page.waitForTimeout(800);
  const btns = await page.locator('.swal2-actions button:visible').allInnerTexts();
  if (btns.length) await page.locator('.swal2-actions button:visible').first().click();
  await page.waitForTimeout(1500);
  const afterOk: any = await page.evaluate(`(() => ({ guardarCalls: window.__guardarCalls, swalText: (document.querySelector('.swal2-container') || { innerText: '' }).innerText.replace(/\\s+/g, ' ').trim(), err: window.__confirmErr }))()`);
  await shot(page, 'NC-14-after-ok');
  page.off('console', onCons);
  const ev = saveEvidence('NC-14-confirmar', { static: st, dialog: dlg, afterEsc, buttonsSecondRun: btns, afterOk, consoleWarnings: warn, blockedPosts: blockedPosts.length });
  console.log('BT-02', JSON.stringify({ st, dlg, afterEsc, btns, afterOk, warn }));
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-02', instance: '#bSend / #bsendConfi / Confirmar()', result: 'executed-static', findingIds: ['NC-14'], reason: `sin disable-on-click (${st.disabledOnClickJS}); Confirmar(): botones visibles=${JSON.stringify(dlg.buttons)} Esc->Guardar llamado=${afterEsc.guardarCalls} (texto tras Esc: "${afterEsc.swalText.slice(0, 80)}"); OK->Guardar llamado=${afterOk.guardarCalls} err=${afterOk.err}; warnings=${JSON.stringify(warn).slice(0, 300)}; POSTs bloqueados=${blockedPosts.length}`, evidence: [ev, 'audit/screenshots/NC-14.png', 'audit/screenshots/NC-14-after-ok.png'] });
}

// ---------- BT-06 icon-only buttons ----------
{
  await load();
  const icons: any = await page.evaluate(`Array.from(document.querySelectorAll('a,button,[role=button]')).filter(function (e) { return e.offsetParent !== null && !(e.textContent || '').trim() && !e.getAttribute('aria-label') && !e.getAttribute('title'); }).map(function (e) { return { tag: e.tagName, id: e.id, cls: (e.className || '').toString().slice(0, 50), html: e.innerHTML.slice(0, 80) }; })`);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-06', instance: 'icon-only controls', result: icons.length ? 'fail' : 'pass', reason: icons.length ? JSON.stringify(icons) : 'no hay controles icon-only visibles en Nueva Cuenta' });
}

// ---------- ?medio= query param prefill (sitemap note) ----------
{
  await page.goto(`${URL_NC}?medio=04`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const v = await page.evaluate(`document.getElementById('cbMedioiD').value`);
  await load();
  const v0 = await page.evaluate(`document.getElementById('cbMedioiD').value`);
  saveEvidence('nueva-cuenta-medio-param', { withParam04: v, without: v0 });
  console.log('medio param', v, 'without', v0);
}

// ---------- CC-01 copy ----------
{
  await load();
  const copy: any = await page.evaluate(`(() => ({ labels: Array.from(document.querySelectorAll('label, h4, .panel-heading, option')).map(function (l) { return (l.textContent || '').replace(/\\s+/g, ' ').trim(); }).filter(Boolean).slice(0, 40), placeholders: Array.from(document.querySelectorAll('[placeholder]')).map(function (e) { return e.id + ':' + e.getAttribute('placeholder'); }), logoAlt: (document.querySelector('#IdHeading img') || {}).alt, title: document.title, lang: document.documentElement.lang, submitValue: document.getElementById('bSend').value }))()`);
  const ev = saveEvidence('NC-15-copy', copy);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'CC-01', instance: 'Nueva Cuenta copy', result: 'fail', findingIds: ['NC-15'], reason: `lang="${copy.lang}" alt logo="${copy.logoAlt}"; placeholders=${JSON.stringify(copy.placeholders).slice(0, 300)}; labels=${JSON.stringify(copy.labels.slice(0, 16))}`, evidence: [ev] });
}

// ---------- sitemap: one confirming GET to WebService1.asmx ----------
{
  const r = await s.context.request.get(`${BASE_URL}/WebService1.asmx`, { maxRedirects: 0 }).catch(() => null);
  const body = r ? await r.text() : '';
  const ops = Array.from(body.matchAll(/<a href="WebService1\.asmx\?op=([A-Za-z0-9_]+)"/g)).map((m) => m[1]);
  saveEvidence('sitemap-webservice1', { status: r?.status(), title: /<title>([^<]*)<\/title>/i.exec(body)?.[1], operations: ops, bodyLen: body.length });
  console.log('WebService1.asmx', r?.status(), ops);
}

saveEvidence('nueva-cuenta-blocked-posts', blockedPosts);
console.log('BLOCKED POSTS (should be 0):', blockedPosts.length, 'asmx calls:', asmxCalls.length, 'dialogs:', JSON.stringify(dialogs));
await s.close();
console.log('DONE nueva-cuenta-fields');
