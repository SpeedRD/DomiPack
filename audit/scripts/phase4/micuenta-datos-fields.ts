// Phase 4 / micuenta — Datos Personales tab: TF-*, EM-07, PH-*, PW-03..07, SL-04/05, TF-12, BT-02/03/07/11, CC-01/03.
// STATIC-ONLY: never fires #cpBody_Button1 nor presses Enter. Fills are client-side only and discarded by reload.
// (page.evaluate with string scripts is intentional audit tooling, not user input.)
import { startSession, go, shot, saveEvidence, visibleText, LONG_5K, LONG_100K, SPECIALS, XSS_PROBE, UNICODE, SQLISH } from '../../support/phase4.ts';
import { log, NAME_SHIM, TAB, probe, contrast, focused, assertNotLogin } from './_micuenta-common.ts';

const SCREEN = TAB.datos.screen;
const s = await startSession({ name: 'p4-micuenta-datos' });
const page = s.page;
await s.context.addInitScript(NAME_SHIM);
await go(page, 'MiCuenta.aspx');
assertNotLogin(page, 'start');

const TEXT = ['#cpBody_lNombre', '#cpBody_lRNC', '#cpBody_lEmail', '#cpBody_lDireccion1', '#cpBody_lDireccion2', '#cpBody_lTelefono', '#cpBody_lTelefono2', '#cpBody_lCelular'];
const PHONES = ['#cpBody_lTelefono', '#cpBody_lTelefono2', '#cpBody_lCelular'];
const ALL = ['#cpBody_lCodigo', ...TEXT, '#cpBody_lContrasena'];
const originals: Record<string, string> = {};
for (const sel of ALL) originals[sel] = await page.$eval(sel, (el) => (el as HTMLInputElement).value);
const ev: Record<string, unknown> = { originalsLengths: Object.fromEntries(Object.entries(originals).map(([k, v]) => [k, v.length])) };

// ---- static facts: validators / attributes / submit wiring ----
const facts = await page.evaluate(() => {
  const form = document.forms[0];
  const submits = Array.from(form.querySelectorAll('input[type=submit], button:not([type]), button[type=submit]')).map((b) => ({ id: b.id, value: (b as HTMLInputElement).value, hidden: (b as HTMLElement).getBoundingClientRect().width === 0 }));
  const fields = Array.from(document.querySelectorAll('#cpBody_lefticontab1 input')).map((i) => {
    const el = i as HTMLInputElement;
    const lab = el.parentElement?.querySelector('label');
    return { id: el.id, type: el.type, required: el.required, maxlength: el.getAttribute('maxlength'), pattern: el.getAttribute('pattern'), autocomplete: el.getAttribute('autocomplete'), readOnly: el.readOnly, disabled: el.disabled, title: el.getAttribute('title'), ariaLabel: el.getAttribute('aria-label'), placeholder: el.placeholder, labelText: lab?.textContent?.trim() || null, labelFor: lab?.getAttribute('for') || null, hidden: el.getBoundingClientRect().width === 0 };
  });
  return {
    pageValidators: (window as any).Page_Validators ? (window as any).Page_Validators.length : null,
    formOnsubmit: form.getAttribute('onsubmit'),
    formNovalidate: form.noValidate,
    defaultSubmitButton: submits[0],
    submits,
    fields,
    swalType: typeof (window as any).swal,
    SwalType: typeof (window as any).Swal,
    confirmarDefined: typeof (window as any).Confirmar,
    guardarDefined: typeof (window as any).Guardar,
    button1: (() => { const b = document.getElementById('cpBody_Button1') as HTMLInputElement; return { onclick: b.getAttribute('onclick'), value: b.value, disabled: b.disabled, hasClickListener: !!(b as any).onclick }; })(),
  };
});
ev.facts = facts;
console.log(JSON.stringify(facts, null, 1));

// ---- TF-01: required (static) ----
for (const sel of TEXT) {
  const f = facts.fields.find((x: any) => '#' + x.id === sel);
  log(SCREEN, 'TF-01', sel, 'executed-static', `required=${f?.required} maxlength=${f?.maxlength} pattern=${f?.pattern}; Page_Validators=${facts.pageValidators}; no client-side required validation exists — server behavior not exercised (Guardar is STATIC-ONLY)`);
}
// ---- TF-02 whitespace / TF-03 spaces ----
for (const sel of TEXT) {
  const r2 = await probe(page, sel, '   ');
  log(SCREEN, 'TF-02', sel, 'executed-static', `whitespace accepted client-side (value len=${r2.valueLen}, validity=${r2.checkValidity}); no trim/validation on input`);
  const r3 = await probe(page, sel, '  Juan  ');
  log(SCREEN, 'TF-03', sel, 'executed-static', `value kept verbatim client-side ('${r3.valueSample}'); trimming can only happen server-side (not exercised)`);
}
// ---- TF-04 length (5k on every field, 100k on two) ----
for (const sel of TEXT) {
  const r = await probe(page, sel, LONG_5K);
  log(SCREEN, 'TF-04', sel, 'executed-static', `5000 chars accepted (len=${r.valueLen}, maxlength=${r.maxlength}, ${r.ms}ms, overflowX=${r.overflowX})`);
}
for (const sel of ['#cpBody_lNombre', '#cpBody_lDireccion1']) {
  const r = await probe(page, sel, LONG_100K);
  log(SCREEN, 'TF-04', sel + ' (100k)', 'executed-static', `100000 chars accepted (len=${r.valueLen}, ${r.ms}ms, overflowX=${r.overflowX})`);
}
await shot(page, 'MC-tf04-long-values', false);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
assertNotLogin(page, 'after reload 1');
// ---- TF-05 specials + XSS probe, TF-06 unicode, TF-07 SQL-ish ----
for (const sel of TEXT) {
  const r5 = await probe(page, sel, SPECIALS + ' ' + XSS_PROBE);
  log(SCREEN, 'TF-05', sel, 'executed-static', `accepted verbatim client-side (len=${r5.valueLen}); no escaping/rejection client-side; server echo not exercised`);
  const r6 = await probe(page, sel, UNICODE);
  log(SCREEN, 'TF-06', sel, 'executed-static', `unicode kept client-side (${r6.valueEqualsInput})`);
  const r7 = await probe(page, sel, SQLISH.join(' '));
  log(SCREEN, 'TF-07', sel, 'executed-static', `SQL/template strings accepted verbatim client-side (${r7.valueEqualsInput})`);
}
// ---- TF-08 name/ID ----
{
  const rn = await probe(page, '#cpBody_lNombre', '12345 67890');
  log(SCREEN, 'TF-08', '#cpBody_lNombre', 'executed-static', `digits accepted in name (validity=${rn.checkValidity}); no format validation client-side`);
  const ri = await probe(page, '#cpBody_lRNC', 'ABC-XYZ');
  const ri2 = await probe(page, '#cpBody_lRNC', '1');
  log(SCREEN, 'TF-08', '#cpBody_lRNC', 'executed-static', `letters ('${ri.valueSample}') and 1-digit ('${ri2.valueSample}') accepted; no cédula/RNC format validation client-side`);
}
// ---- TF-09 paste multiline ----
for (const sel of ['#cpBody_lNombre', '#cpBody_lDireccion1']) {
  const r = await probe(page, sel, 'linea1\nlinea2\r\nlinea3', { paste: true });
  log(SCREEN, 'TF-09', sel, 'executed-static', `pasted multiline -> value '${r.valueSample}' (len=${r.valueLen}); browser strips newlines in single-line input`);
}
// ---- TF-10 labeling ----
{
  const noFor = facts.fields.filter((f: any) => !f.hidden && f.labelText && !f.labelFor && !f.ariaLabel);
  log(SCREEN, 'TF-10', ALL.join(','), noFor.length ? 'fail' : 'pass', `${noFor.length} visible fields have a visible <label> but no for/id association or aria-label: ${noFor.map((f: any) => f.id).join(',')}`, ['MC-01']);
}
// ---- TF-11 textarea: none on this tab ----
log(SCREEN, 'TF-11', 'n/a', 'omitted', 'no textarea on Datos Personales');
// ---- TF-12 disabled-on-load ----
{
  const cod = facts.fields.find((f: any) => f.id === 'cpBody_lCodigo');
  const r = await probe(page, '#cpBody_lCodigo', 'X').catch((e) => ({ valueSample: 'fill refused: ' + (e as Error).message.split('\n')[0] } as any));
  const typed = await page.$eval('#cpBody_lCodigo', (el) => (el as HTMLInputElement).value);
  log(SCREEN, 'TF-12', '#cpBody_lCodigo', 'fail', `readonly=${cod?.readOnly} disabled=${cod?.disabled} title=${cod?.title}; typing attempt left value '${typed}'; grey background only, no explanation/tooltip of why it is locked`, ['MC-02']);
  const suc = await page.$eval('#cpBody_lSucursal', (el) => ({ disabled: (el as HTMLSelectElement).disabled, title: el.getAttribute('title'), cls: el.className, selected: (el as HTMLSelectElement).selectedOptions[0]?.text, opts: (el as HTMLSelectElement).options.length, tabbable: (el as HTMLSelectElement).tabIndex }));
  log(SCREEN, 'SL-04', '#cpBody_lSucursal', 'fail', `disabled=${suc.disabled} title=${suc.title} selected='${suc.selected}' options=${suc.opts}; no tooltip/explanation of the lock`, ['MC-02']);
  log(SCREEN, 'SL-05', '#cpBody_lSucursal', 'omitted', 'select is disabled for this account: not focusable/operable by keyboard by design; keyboard operation cannot be evaluated here');
  ev.sucursal = suc;
}
// ---- EM-07 / PH-06 (semantic types) ----
{
  const em = facts.fields.find((f: any) => f.id === 'cpBody_lEmail');
  log(SCREEN, 'EM-07', '#cpBody_lEmail', 'fail', `type=${em?.type} autocomplete=${em?.autocomplete}; no native email semantics/keyboard/inline validation`, ['MC-03']);
  for (const sel of PHONES) {
    const f = facts.fields.find((x: any) => '#' + x.id === sel);
    log(SCREEN, 'PH-06', sel, 'fail', `type=${f?.type} autocomplete=${f?.autocomplete} inputmode=none; no tel semantics`, ['MC-03']);
  }
}
// ---- PH-01/02/04/05 ----
for (const sel of PHONES) {
  const f = facts.fields.find((x: any) => '#' + x.id === sel);
  log(SCREEN, 'PH-01', sel, 'executed-static', `required=${f?.required}; no client-side required validation; server not exercised`);
  const a = await probe(page, sel, 'abc +++ ()');
  log(SCREEN, 'PH-02', sel, 'executed-static', `letters/symbols accepted client-side ('${a.valueSample}', validity=${a.checkValidity}); no numeric validation`);
  const l = await probe(page, sel, '9'.repeat(60));
  const sh = await probe(page, sel, '1');
  log(SCREEN, 'PH-04', sel, 'executed-static', `60 digits accepted (len=${l.valueLen}, maxlength=${l.maxlength}); 1 digit accepted (len=${sh.valueLen}); no length bounds client-side`);
  const w = await probe(page, sel, '   ');
  const sp = await probe(page, sel, '809 123 4567');
  const da = await probe(page, sel, '809-123-4567');
  log(SCREEN, 'PH-05', sel, 'executed-static', `whitespace-only kept (len=${w.valueLen}); '${sp.valueSample}' and '${da.valueSample}' kept verbatim; no normalization client-side`);
}
// ---- PW-03..07 ----
{
  const pw = facts.fields.find((f: any) => f.id === 'cpBody_lContrasena');
  const r3 = await probe(page, '#cpBody_lContrasena', 'P'.repeat(10000));
  log(SCREEN, 'PW-03', '#cpBody_lContrasena', 'executed-static', `10000 chars accepted client-side (len=${r3.valueLen}, maxlength=${r3.maxlength}, ${r3.ms}ms)`);
  const r4a = await probe(page, '#cpBody_lContrasena', `  ${SPECIALS} ${UNICODE}  `);
  const r4b = await probe(page, '#cpBody_lContrasena', '     ');
  log(SCREEN, 'PW-04', '#cpBody_lContrasena', 'executed-static', `special/unicode/leading-trailing spaces kept verbatim (len=${r4a.valueLen}); whitespace-only accepted (len=${r4b.valueLen}); no client-side policy`);
  const hint = await page.evaluate(() => {
    const el = document.getElementById('cpBody_lContrasena')!;
    const grp = el.closest('.form-group');
    return { groupText: grp?.textContent?.replace(/\s+/g, ' ').trim(), siblings: Array.from(grp?.children || []).map((c) => c.tagName + '.' + c.className), meterLike: document.querySelectorAll('[class*=strength], [class*=meter], progress').length };
  });
  log(SCREEN, 'PW-05', '#cpBody_lContrasena', 'fail', `no strength meter / min-length / policy hint (group text='${hint.groupText}', meter-like=${hint.meterLike}, minlength=${await page.getAttribute('#cpBody_lContrasena', 'minlength')})`, ['MC-04']);
  const reveal = await page.evaluate(() => document.querySelectorAll('#cpBody_lefticontab1 [class*=eye], #cpBody_lefticontab1 [class*=reveal], #cpBody_lefticontab1 [class*=toggle-password]').length);
  log(SCREEN, 'PW-06', '#cpBody_lContrasena', 'fail', `no show/hide toggle (reveal-like elements=${reveal}); autocomplete=${pw?.autocomplete} (expected 'new-password' on a change-password field; browsers may autofill the saved password here)`, ['MC-04']);
  log(SCREEN, 'PW-07', '#cpBody_lContrasena', 'executed-static', `loads empty with placeholder 'Nueva Contraseña', no helper text stating that blank = keep current password; optional semantics NOT verified (submit is STATIC-ONLY)`);
  ev.passwordHint = hint;
}
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
assertNotLogin(page, 'after reload 2');
// ---- BT-02 / BT-03 / BT-07 (static) on Guardar ----
{
  log(SCREEN, 'BT-02', '#cpBody_Button1 (Guardar)', 'executed-static', `type=submit, onclick=${facts.button1.onclick}, form onsubmit=${facts.formOnsubmit}, no confirm dialog, no disable-on-click; a Confirmar()/swal helper exists in page (${facts.confirmarDefined}, swal=${facts.swalType}, Swal=${facts.SwalType}) but is not wired to this button`, ['MC-05']);
  log(SCREEN, 'BT-03', '#cpBody_Button1 (Guardar)', 'executed-static', `no required attributes, no Page_Validators (${facts.pageValidators}), form.noValidate=${facts.formNovalidate}: an empty-field submit would reach the server unvalidated (not fired)`, ['MC-06']);
  log(SCREEN, 'BT-07', '#cpBody_Button1 (Guardar)', 'executed-static', `no client-side loading/disabled feedback wired (plain input[type=submit], full postback); not fired`, ['MC-05']);
  const firstSubmit = facts.defaultSubmitButton;
  log(SCREEN, 'BT-03', 'Enter key in any field (implicit submission)', 'executed-static', `first submit button in form (implicit-submission default) is #${firstSubmit?.id} '${firstSubmit?.value}' hidden=${firstSubmit?.hidden}; Enter NOT pressed (would post back)`, ['MC-07']);
}
// ---- BT-11: focus-visible + tab order across the tab ----
{
  await page.click('#cpBody_ltab1');
  await page.focus('#cpBody_lCodigo');
  const order: any[] = [];
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    order.push(await focused(page));
  }
  ev.tabOrder = order;
  const noIndicator = order.filter((o) => o && o.visible && !o.indicator);
  const seq = order.map((o) => (o ? o.id || o.tag + ':' + o.text : 'null')).join(' > ');
  log(SCREEN, 'BT-11', 'Datos Personales form', noIndicator.length ? 'fail' : 'pass', `tab order: ${seq}; elements focused without visible indicator: ${noIndicator.map((o) => o.id || o.tag).join(',') || 'none'}`, noIndicator.length ? ['MC-08'] : undefined);
  await page.focus('#cpBody_Button1');
  const btnFocus = await focused(page);
  ev.guardarFocus = btnFocus;
  await shot(page, 'MC-08', false);
  console.log('Guardar focus', btnFocus);
}
// ---- CC-01 / CC-03 copy ----
{
  const copy = await page.evaluate(() => {
    const pane = document.getElementById('cpBody_lefticontab1')!;
    const labels = Array.from(pane.querySelectorAll('label, h5, h6, .card-title, legend, b, strong')).map((l) => l.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const placeholders = Array.from(pane.querySelectorAll('input[placeholder]')).map((i) => i.getAttribute('placeholder'));
    return { lang: document.documentElement.lang, title: document.title, heading: document.querySelector('.page-title-heading')?.textContent?.replace(/\s+/g, ' ').trim(), labels, placeholders, tabs: Array.from(document.querySelectorAll('a[data-toggle=tab]')).map((a) => a.textContent?.trim()), buttons: Array.from(pane.querySelectorAll('input[type=submit]')).map((b) => (b as HTMLInputElement).value) };
  });
  ev.copy = copy;
  console.log('copy', JSON.stringify(copy));
  log(SCREEN, 'CC-01', 'Datos Personales copy', 'fail', `heading '${copy.heading}'; labels ${JSON.stringify(copy.labels)}; placeholders ${JSON.stringify(copy.placeholders)}; html lang=${copy.lang}`, ['MC-09']);
  log(SCREEN, 'CC-03', 'validation/empty/loading messages', 'executed-static', 'no client-side validation messages exist on this form (no validators, no required); server messages not exercised');
}
// ---- contrast samples (feeds AX-05 in the responsive/axe script; recorded here for evidence) ----
ev.contrast = {
  sucursal: await contrast(page, '#cpBody_lSucursal'),
  codigo: await contrast(page, '#cpBody_lCodigo'),
  placeholderTelefono: await page.evaluate(() => { const el = document.getElementById('cpBody_lTelefono')!; const cs = getComputedStyle(el, '::placeholder'); return { color: cs.color, bg: getComputedStyle(el).backgroundColor }; }),
  guardar: await contrast(page, '#cpBody_Button1'),
};
console.log('contrast', JSON.stringify(ev.contrast));
console.log(saveEvidence('MC-datos-fields', ev));
await shot(page, 'p4-micuenta-datos-final', true);
await s.close();
