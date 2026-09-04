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

const s = await startSession({ name: 'p4-nueva-cuenta-fields', auth: false });
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

// ---------- baseline: attributes, labels, required vs asterisk ----------
await load();
const base: any = await page.evaluate(`(() => {
  var ids = ['ddTipo','Identificacion','iRNC','Nombre','tbContacto','Password','sSexo','ltelefono','lcelular','Email','Email1','tbFecha','lSucursal','ckDomicilio','Direccion','cbMedioiD','ckRua','bSend','bsendConfi','codigoPromo','TokenID','cbPais','cbProvincias'];
  var out = {};
  ids.forEach(function (id) {
    var e = document.getElementById(id); if (!e) { out[id] = null; return; }
    var grp = e.closest('.form-group');
    var lab = grp ? grp.querySelector('label') : null;
    var cs = getComputedStyle(e);
    out[id] = { tag: e.tagName, type: e.getAttribute('type'), required: e.hasAttribute('required'), disabled: e.disabled === true, placeholder: e.getAttribute('placeholder'), maxlength: e.getAttribute('maxlength'), minlength: e.getAttribute('minlength'), pattern: e.getAttribute('pattern'), autocomplete: e.getAttribute('autocomplete'), multiple: e.hasAttribute('multiple'), min: e.getAttribute('min'), max: e.getAttribute('max'), tabindex: e.getAttribute('tabindex'), autofocus: e.hasAttribute('autofocus'),
      labelsAssoc: e.labels ? e.labels.length : 0, ariaLabel: e.getAttribute('aria-label'), nearbyLabel: lab ? (lab.textContent || '').replace(/\\s+/g, ' ').trim() : null, asterisk: lab ? /\\*/.test(lab.textContent) : null,
      visible: cs.display !== 'none' && cs.visibility !== 'hidden' && e.offsetParent !== null, options: e.tagName === 'SELECT' ? e.options.length : undefined, value: e.tagName === 'SELECT' ? e.value : (e.type === 'checkbox' ? e.checked : undefined) };
  });
  return { fields: out, lang: document.documentElement.lang, title: document.title, logoAlt: (document.querySelector('#IdHeading img') || {}).alt, preloaderVisible: (function () { var p = document.querySelector('.se-pre-con'); return p ? getComputedStyle(p).display !== 'none' && parseFloat(getComputedStyle(p).opacity) > 0.5 : false; })(), bodyText: (document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 600), formNovalidate: document.forms[0].noValidate, bSendFormnovalidate: document.getElementById('bSend').formNoValidate, jq: window.jQuery ? window.jQuery.fn.jquery : null, swal: typeof window.Swal, labelsNoFor: Array.from(document.querySelectorAll('label')).filter(function (l) { return !l.htmlFor; }).map(function (l) { return (l.textContent || '').replace(/\\s+/g, ' ').trim(); }) };
})()`);
saveEvidence('nueva-cuenta-baseline', base);
console.log('BASE', JSON.stringify(base).slice(0, 3000));

// TF-10 / AX-02 / DR-09 / CC-05 — label association
{
  const f = base.fields;
  const unl = Object.entries(f).filter(([id, x]: any) => x && x.visible && ['INPUT', 'SELECT'].includes(x.tag) && x.type !== 'submit' && x.labelsAssoc === 0 && !x.ariaLabel).map(([id]) => id);
  for (const id of ['Identificacion', 'Nombre', 'Password', 'ltelefono', 'lcelular', 'Email', 'Email1']) {
    logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-10', instance: `#${id}`, result: unl.includes(id) ? 'fail' : 'pass', findingIds: unl.includes(id) ? ['NC-01'] : [], reason: `labels=${f[id]?.labelsAssoc} nearbyLabel="${f[id]?.nearbyLabel}" placeholder="${f[id]?.placeholder}"` });
  }
  logCase({ group: GROUP, screen: SCREEN, caseId: 'AX-02', instance: 'todos los campos', result: unl.length ? 'fail' : 'pass', findingIds: ['NC-01'], reason: `sin label asociado/aria-label: ${unl.join(', ')}; labels sin for: ${JSON.stringify(base.labelsNoFor)}` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'DR-09', instance: '#tbFecha', result: unl.includes('tbFecha') ? 'fail' : 'pass', findingIds: ['NC-01'], reason: `type=date nativo (teclado OK); labelsAssoc=${f.tbFecha?.labelsAssoc} nearbyLabel="${f.tbFecha?.nearbyLabel}" placeholder="${f.tbFecha?.placeholder}" autofocus=${f.tbFecha?.autofocus} disabled=${f.tbFecha?.disabled}` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'CC-05', instance: '#ckDomicilio/#ckRua', result: 'fail', findingIds: ['NC-02'], reason: `ckDomicilio labelsAssoc=${f.ckDomicilio?.labelsAssoc} nearby="${f.ckDomicilio?.nearbyLabel}"; ckRua labelsAssoc=${f.ckRua?.labelsAssoc} nearby="${f.ckRua?.nearbyLabel}" (sin texto explicativo)` });
  // required vs asterisk mismatch
  const mism = Object.entries(f).filter(([id, x]: any) => x && x.visible && x.nearbyLabel !== null && x.asterisk !== null && x.asterisk !== x.required).map(([id, x]: any) => `${id}: asterisk=${x.asterisk} required=${x.required} disabled=${x.disabled}`);
  saveEvidence('NC-03-required-vs-asterisk', Object.fromEntries(Object.entries(f).map(([id, x]: any) => [id, x && { label: x.nearbyLabel, asterisk: x.asterisk, required: x.required, disabled: x.disabled, visible: x.visible }])));
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-01', instance: '#Identificacion', result: f.Identificacion.required ? 'pass' : 'fail', findingIds: f.Identificacion.required ? [] : ['NC-03'], reason: `label "${f.Identificacion.nearbyLabel}" pero required=${f.Identificacion.required}; mismatches: ${mism.join(' | ')}`, evidence: ['audit/logs/evidence/NC-03-required-vs-asterisk.json'] });
}

// ---------- TF-01 #Nombre (required) + BT-03 + EM-01 ----------
{
  await load();
  await page.fill('#Nombre', '');
  const r = await safeClickSend('TF-01 Nombre');
  await shot(page, 'nueva-cuenta-TF-01');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-01', instance: '#Nombre', result: r.clicked && r.blocked === 0 && r.active === 'Nombre' ? 'pass' : 'fail', reason: `clicked=${r.clicked} posts=${r.blocked} focus=${r.active} invalid=${JSON.stringify(r.validity.invalid.map((i: any) => i.id))} (solo burbuja nativa)`, evidence: ['audit/screenshots/nueva-cuenta-TF-01.png'] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-03', instance: '#bSend (campos requeridos vacíos)', result: r.clicked && r.blocked === 0 ? 'executed-static' : 'fail', findingIds: ['NC-03'], reason: `browser blocked submit: focus=${r.active}; invalid=${JSON.stringify(r.validity.invalid)}; Password/lcelular required+disabled => no validados ni enviados`, evidence: ['audit/screenshots/nueva-cuenta-TF-01.png'] });
  await page.fill('#Nombre', 'Prueba');
  const r2 = await safeClickSend('EM-01');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'EM-01', instance: '#Email', result: r2.clicked && r2.active === 'Email' ? 'pass' : 'fail', reason: `focus=${r2.active} invalid=${JSON.stringify(r2.validity.invalid.map((i: any) => i.id + ':' + i.msg))}` });
  await page.fill('#Email', 'auditoria@example.com');
  const r3 = await safeClickSend('EM-01 Email1');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'EM-01', instance: '#Email1', result: r3.clicked && r3.active === 'Email1' ? 'pass' : 'fail', reason: `focus=${r3.active}` });
}

// ---------- TF-02 whitespace / TF-03 padded (Nombre, Identificacion) ----------
{
  await load();
  await fillValidCore();
  await page.fill('#Nombre', '   ');
  const v = await formValidity();
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-02', instance: '#Nombre', result: v.valid ? 'fail' : 'pass', findingIds: v.valid ? ['NC-03'] : [], reason: `whitespace-only Nombre -> form.checkValidity()=${v.valid} (se enviaría; no se hizo clic)` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-02', instance: '#Identificacion', result: 'fail', findingIds: ['NC-03'], reason: 'sin required ni pattern: vacío o espacios pasan la validación cliente (ver TF-01)' });
  await page.fill('#Nombre', '  Juan  ');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-03', instance: '#Nombre', result: 'executed-static', reason: 'sin trim en cliente (value conserva espacios); comportamiento en servidor no observable sin enviar (STATIC-ONLY)' });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-03', instance: '#Identificacion', result: 'executed-static', reason: 'sin trim en cliente; el valor con espacios se enviaría tal cual a WebService1.asmx/GetNombreCedula en blur (no ejercido)' });
}

// ---------- TF-04 long / TF-09 paste multiline (Nombre) ----------
{
  await load();
  await page.fill('#Nombre', LONG_5K);
  const m1: any = await page.evaluate(`(() => { var e = document.getElementById('Nombre'); var b = e.getBoundingClientRect(); return { len: e.value.length, w: Math.round(b.width), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }; })()`);
  await page.fill('#Nombre', LONG_100K);
  const m2: any = await page.evaluate(`(() => { var e = document.getElementById('Nombre'); var b = e.getBoundingClientRect(); return { len: e.value.length, w: Math.round(b.width), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }; })()`);
  await shot(page, 'nueva-cuenta-TF-04');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-04', instance: '#Nombre', result: 'executed-static', reason: `maxlength=${base.fields.Nombre.maxlength}; 5k aceptado (len=${m1.len}, overflow=${m1.overflow}); 100k aceptado (len=${m2.len}, overflow=${m2.overflow}); servidor no ejercido` , evidence: ['audit/screenshots/nueva-cuenta-TF-04.png'] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-04', instance: '#Identificacion', result: 'executed-static', reason: `maxlength=${base.fields.Identificacion.maxlength}; sin límite cliente; no se disparó blur con 100k (evita llamada al web service)` });
  await page.fill('#Nombre', '');
  await page.focus('#Nombre');
  await page.keyboard.insertText('linea1\nlinea2');
  const pv = await page.inputValue('#Nombre');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-09', instance: '#Nombre', result: 'pass', reason: `paste multiline -> "${pv}" (saltos eliminados por el navegador)` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-09', instance: '#Identificacion', result: 'pass', reason: 'input type=text: mismo comportamiento nativo' });
}

// ---------- TF-05 / TF-06 / TF-07 (client-side only; asmx blocked) ----------
{
  await load();
  allowAsmx = false;
  const outs: string[] = [];
  for (const [n, v] of [['specials', SPECIALS], ['script', XSS_PROBE], ['unicode', UNICODE], ...SQLISH.map((q, i) => [`sqlish${i}`, q] as [string, string])]) {
    await page.fill('#Nombre', v);
    await page.fill('#Identificacion', v);
    await page.focus('#Nombre'); // blur Identificacion -> GetDataCliente -> asmx (aborted)
    await page.waitForTimeout(400);
    const echoed = await page.inputValue('#Nombre');
    outs.push(`${n}: value kept=${echoed === v}`);
  }
  const blockedAsmx = asmxCalls.filter((c) => !c.allowed).length;
  const ev = saveEvidence('nueva-cuenta-asmx-calls', asmxCalls);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-05', instance: '#Nombre/#Identificacion', result: 'executed-static', reason: `${outs.slice(0, 2).join('; ')}; sin escape/rechazo cliente; ASP.NET request validation no verificable sin POST; llamadas asmx bloqueadas=${blockedAsmx}`, evidence: [ev] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-06', instance: '#Nombre/#Identificacion', result: 'executed-static', reason: `${outs[2]}; aceptado en cliente` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-07', instance: '#Nombre/#Identificacion', result: 'executed-static', reason: `${outs.slice(3).join('; ')}; tratado como texto literal en cliente; servidor no ejercido (probe de validación, no se envía)`, evidence: [ev] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'CB-01', instance: '(dialogs during probes)', result: 'executed-static', reason: `alert() dialogs captured: ${JSON.stringify(dialogs)}` });
}

// ---------- TF-08 / PH-07 / TF-12: letters in ID -> real lookup with bogus values ----------
{
  await load();
  const results: any[] = [];
  for (const v of ['abc', '00000000000']) {
    allowAsmx = true;
    const n0 = asmxCalls.length;
    await page.fill('#Identificacion', v);
    await page.focus('#Nombre');
    await page.waitForTimeout(4000);
    allowAsmx = false;
    const st: any = await page.evaluate(`(() => { var ids = ['Password','ltelefono','lcelular','Email','tbFecha']; var o = {}; ids.forEach(function (id) { o[id] = document.getElementById(id).disabled; }); return { disabled: o, nombre: document.getElementById('Nombre').value, fecha: document.getElementById('tbFecha').value, mensaje: (document.getElementById('Mensaje') || {}).innerText, swal: !!document.querySelector('.swal2-container'), preloader: (function () { var p = document.querySelector('.se-pre-con'); return p ? getComputedStyle(p).display : null; })(), rua: document.getElementById('ckRua').checked }; })()`);
    results.push({ input: v, calls: asmxCalls.slice(n0).map((c) => ({ url: c.url.slice(-40), status: c.status, body: c.body })), after: st, dialogs: [...dialogs] });
  }
  const ev = saveEvidence('NC-04-id-lookup', results);
  console.log('TF-08', JSON.stringify(results).slice(0, 1500));
  await shot(page, 'NC-04');
  const anyEnabled = results.some((r) => Object.values(r.after.disabled).some((d) => d === false));
  const anyFeedback = results.some((r) => r.after.swal || (r.after.mensaje && r.after.mensaje.trim()) || r.dialogs.length);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-08', instance: '#Identificacion (letras / formato inválido)', result: anyFeedback ? 'pass' : 'fail', findingIds: ['NC-04'], reason: `lookups: ${JSON.stringify(results.map((r) => ({ input: r.input, calls: r.calls.map((c: any) => c.url + '->' + c.status), enabledAfter: anyEnabled })))}; feedbackToUser=${anyFeedback}`, evidence: [ev, 'audit/screenshots/NC-04.png'] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-08', instance: '#Nombre (números)', result: 'fail', findingIds: ['NC-03'], reason: 'sin pattern; "12345" aceptado en cliente (type=text, sin validación de formato)' });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PH-07', instance: '#ltelefono/#lcelular (trigger de habilitación)', result: 'executed-static', findingIds: ['NC-04'], reason: `habilitados solo en success de WebService1.asmx/GetNombreCedula|GetNombreRNC (onblur de #Identificacion/#iRNC); valida_cedula() existe pero no está enlazada a ningún evento; error callback vacío -> sin feedback; resultado con valores bogus: ${JSON.stringify(results.map((r) => r.after.disabled))}`, evidence: [ev] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-12', instance: '#Password/#ltelefono/#lcelular/#tbFecha (disabled on load)', result: 'fail', findingIds: ['NC-04'], reason: 'deshabilitados sin explicación visible; dependen de una llamada AJAX externa; no hay tooltip/mensaje' });
}

// ---------- EM-02..EM-08 (client-side validity of type=email) ----------
{
  await load();
  const check = async (id: string, v: string) => {
    await page.fill(`#${id}`, v);
    return page.evaluate(`(() => { var e = document.getElementById('${id}'); return { value: e.value, valid: e.validity.valid, typeMismatch: e.validity.typeMismatch, valueMissing: e.validity.valueMissing, msg: e.validationMessage }; })()`) as Promise<any>;
  };
  const em02: any[] = [];
  for (const v of EMAIL_INVALID) em02.push({ input: v, ...(await check('Email', v)) });
  const accepted = em02.filter((x) => x.valid).map((x) => x.input);
  const ev02 = saveEvidence('nueva-cuenta-EM-02', em02);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'EM-02', instance: '#Email', result: accepted.length ? 'fail' : 'pass', findingIds: accepted.length ? ['NC-05'] : [], reason: `validación nativa type=email; aceptados como válidos: ${JSON.stringify(accepted)}; rechazados: ${JSON.stringify(em02.filter((x) => !x.valid).map((x) => x.input))}`, evidence: [ev02] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'EM-02', instance: '#Email1', result: accepted.length ? 'fail' : 'pass', findingIds: accepted.length ? ['NC-05'] : [], reason: 'mismo input type=email sin multiple/pattern; misma validación nativa' });
  // EM-03 ; list
  const em03: any[] = [];
  for (const v of ['a@x.com;b@y.com', 'a@x.com;;', 'a@x.com; ', 'a@x.com; b@y.com']) em03.push({ input: v, ...(await check('Email', v)) });
  const ev03 = saveEvidence('NC-05-email-list', { placeholder: base.fields.Email.placeholder, multiple: base.fields.Email.multiple, results: em03 });
  await page.fill('#Nombre', 'Prueba'); await page.fill('#Email', 'a@x.com;b@y.com'); await page.fill('#Email1', 'a@x.com;b@y.com');
  const r03 = await safeClickSend('EM-03');
  await shot(page, 'NC-05');
  const listRejected = em03.every((x) => !x.valid);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'EM-03', instance: '#Email/#Email1', result: listRejected ? 'fail' : 'pass', findingIds: ['NC-05'], reason: `placeholder promete lista separada por ';' pero type=email sin multiple: ${JSON.stringify(em03.map((x) => x.input + '=>' + x.valid))}; clic en Crear Cuenta: focus=${r03.active} msg="${r03.validity.invalid[0]?.msg}"`, evidence: [ev03, 'audit/screenshots/NC-05.png'] });
  // EM-04 dual fields
  await load();
  await page.fill('#Nombre', 'Prueba'); await page.fill('#Email', 'uno@example.com'); await page.fill('#Email1', 'dos@example.com');
  const v04 = await formValidity();
  const js04 = await page.evaluate(`Array.from(document.scripts).map(function (s) { return s.textContent; }).join('\\n').includes('Email1')`);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'EM-04', instance: '#Email vs #Email1', result: v04.valid ? 'fail' : 'pass', findingIds: ['NC-06'], reason: `Email≠Email1 -> form válido en cliente=${v04.valid}; JS de la página referencia Email1=${js04}; ambos con el mismo placeholder de lista; etiqueta "Confirma tu Correo Electrónico" sin comparación cliente (servidor no ejercido)` });
  // EM-05 long
  const long = 'a'.repeat(300) + '@' + 'b'.repeat(300) + '.' + 'c'.repeat(100);
  const r05 = await check('Email', long);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'EM-05', instance: '#Email/#Email1', result: 'executed-static', reason: `700+ chars -> valid=${r05.valid} (sin maxlength); servidor no ejercido` });
  // EM-06 whitespace
  const r06a = await check('Email', '     ');
  const r06b = await check('Email', '  ok@example.com  ');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'EM-06', instance: '#Email/#Email1', result: r06a.valueMissing && r06b.valid && r06b.value === 'ok@example.com' ? 'pass' : 'fail', reason: `whitespace-only -> value="${r06a.value}" valueMissing=${r06a.valueMissing}; padded -> value="${r06b.value}" (sanitización nativa type=email)` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'EM-07', instance: '(Mi Cuenta #cpBody_lEmail)', result: 'omitted', reason: 'Caso exclusivo de Mi Cuenta (grupo micuenta).' });
  // EM-08 IDN
  const r08a = await check('Email', 'usuario@dominío.com');
  const r08b = await check('Email', '名@例.jp');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'EM-08', instance: '#Email/#Email1', result: 'executed-static', reason: `usuario@dominío.com -> valid=${r08a.valid} value="${r08a.value}"; 名@例.jp -> valid=${r08b.valid}; servidor no ejercido` });
}

// ---------- PH-* (enable phones as the callback would) ----------
{
  await load();
  await enableFields();
  const ph = async (id: string, v: string) => { await page.fill(`#${id}`, v); return page.evaluate(`(() => { var e = document.getElementById('${id}'); return { value: e.value, valid: e.validity.valid, valueMissing: e.validity.valueMissing, type: e.type, inputmode: e.getAttribute('inputmode'), pattern: e.getAttribute('pattern'), maxlength: e.maxLength }; })()`) as Promise<any>; };
  const cel0 = await ph('lcelular', '');
  const tel0 = await ph('ltelefono', '');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PH-01', instance: '#lcelular', result: cel0.valueMissing ? 'pass' : 'fail', reason: `required=${base.fields.lcelular.required} valueMissing=${cel0.valueMissing} (solo cuando está habilitado; deshabilitado al cargar => no se valida)` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PH-01', instance: '#ltelefono', result: 'pass', reason: `opcional según etiqueta "(opcional)"; required=${base.fields.ltelefono.required}` });
  const rows: any[] = [];
  for (const v of ['abc', '+++', '()', '1', '1'.repeat(60), '809 123 4567', '809-123-4567', '   ']) { rows.push({ id: 'lcelular', input: v, ...(await ph('lcelular', v)) }); rows.push({ id: 'ltelefono', input: v, ...(await ph('ltelefono', v)) }); }
  const ev = saveEvidence('NC-07-phones', rows);
  const allValid = rows.filter((r) => r.input.trim() !== '').every((r) => r.valid);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PH-02', instance: '#ltelefono/#lcelular', result: allValid ? 'fail' : 'pass', findingIds: ['NC-07'], reason: `letras/símbolos aceptados en cliente: ${JSON.stringify(rows.filter((r) => ['abc', '+++', '()'].includes(r.input)).map((r) => r.id + ':' + r.input + '=>' + r.valid))}`, evidence: [ev] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PH-03', instance: '(#cpBody_lCelularDependiente)', result: 'omitted', reason: 'Campo de Mi Cuenta > Dependientes (grupo micuenta).' });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PH-04', instance: '#ltelefono/#lcelular', result: 'fail', findingIds: ['NC-07'], reason: `1 dígito y 60 dígitos válidos en cliente (maxlength=${rows[0].maxlength}, sin minlength/pattern)`, evidence: [ev] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PH-05', instance: '#ltelefono/#lcelular', result: 'executed-static', reason: `espacios/guiones aceptados tal cual (sin normalización cliente); whitespace-only en lcelular: valid=${rows.find((r) => r.id === 'lcelular' && r.input === '   ')?.valid}`, evidence: [ev] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PH-06', instance: '#ltelefono/#lcelular', result: 'fail', findingIds: ['NC-07'], reason: `type=${rows[0].type} inputmode=${rows[0].inputmode} (no type=tel: sin teclado numérico móvil)` });
}

// ---------- PW-03/04/05/06 (#Password enabled as the callback would) ----------
{
  await load();
  await enableFields();
  const pw = async (v: string) => { await page.fill('#Password', v); return page.evaluate(`(() => { var e = document.getElementById('Password'); return { len: e.value.length, valid: e.validity.valid, minlength: e.minLength, maxlength: e.maxLength, pattern: e.getAttribute('pattern'), autocomplete: e.getAttribute('autocomplete') }; })()`) as Promise<any>; };
  const a = await pw('p'.repeat(10000));
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PW-03', instance: '#Password', result: 'executed-static', reason: `10k chars aceptados en cliente (len=${a.len}, maxlength=${a.maxlength}); servidor no ejercido` });
  const b = await pw(SPECIALS), c = await pw(UNICODE), d = await pw('     '), e = await pw(' abc ');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PW-04', instance: '#Password', result: 'executed-static', reason: `specials valid=${b.valid}; unicode valid=${c.valid}; whitespace-only valid=${d.valid} (aceptado como contraseña); padded valid=${e.valid}; sin trim cliente` });
  const hint = await page.evaluate(`(() => { var g = document.getElementById('Password').closest('.form-group'); return (g ? g.innerText : '').replace(/\\s+/g, ' ').trim(); })()`);
  const meter = await page.evaluate(`!!document.querySelector('[class*="strength"], [class*="meter"], progress')`);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PW-05', instance: '#Password', result: 'fail', findingIds: ['NC-08'], reason: `minlength=${a.minlength} pattern=${a.pattern} meter=${meter} hint="${hint}" (sin política/indicador; whitespace-only válido)` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PW-06', instance: '#Password', result: 'fail', findingIds: ['NC-08'], reason: `sin toggle mostrar/ocultar; autocomplete=${a.autocomplete} (esperado new-password); sin confirmación de contraseña` });
}

saveEvidence('nueva-cuenta-blocked-posts', blockedPosts);
console.log('BLOCKED POSTS (should be 0):', blockedPosts.length, 'asmx calls:', asmxCalls.length);
await s.close();
console.log('DONE nueva-cuenta-fields');
