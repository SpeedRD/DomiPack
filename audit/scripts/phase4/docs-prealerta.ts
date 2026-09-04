// PreAlerta.aspx — client-side-only probes. NEVER clicks #cpBody_bSend, never presses Enter inside the form.
// Safety nets: form.submit() is neutralised, submit events are cancelled, and any POST to PreAlerta.aspx is aborted
// at the network layer. Validation is observed via checkValidity()/reportValidity() (no submit).
// Cases: TF-01..TF-12, NM-01..05, SL-01/05/07, FU-01, TB-01/08, BT-02/03/06/07/11, CC-01/03, AX-02.
import path from 'path';
import { startSession, go, shot, saveEvidence, saveText, serverErrorSignature, BASE_URL, LONG_5K, LONG_100K, SPECIALS, XSS_PROBE, UNICODE, SQLISH, AUDIT_ROOT } from '../../support/phase4.ts';
import { shimName, L, SCREEN, tabTraverse } from './docs-common.ts';

const s = await startSession({ name: 'p4-docs-prealerta' });
const page = s.page;
await shimName(page);
const SC = SCREEN.prealerta;
const FIX = path.join(AUDIT_ROOT, 'scripts', 'phase4', 'fixtures');

// ---- Safety nets (belt and braces) ----
let blockedPosts = 0;
await page.route('**/PreAlerta.aspx', (route) => {
  if (route.request().method() === 'POST') {
    blockedPosts++;
    console.log('!! blocked POST to PreAlerta.aspx (safety net)');
    return route.abort();
  }
  return route.continue();
});
const GUARD = `
  (function(){
    var f = document.forms['frmBody']; if (!f) return;
    window.__blockedSubmit = 0;
    f.submit = function(){ window.__blockedSubmit++; };
    f.addEventListener('submit', function(e){ e.preventDefault(); e.stopImmediatePropagation(); window.__blockedSubmit++; }, true);
    window.__doPostBack = function(){ window.__blockedSubmit++; };
  })();`;
async function load() {
  await go(page, 'PreAlerta.aspx');
  await page.evaluate(GUARD);
}
await load();

const F = {
  tracking: '#cpBody_Tracking',
  cliente: '#cpBody_ClienteID',
  fob: '#cpBody_FOB',
  transpos: '#cpBody_Transpos',
  suplidor: '#cpBody_Suplidor',
  contenido: '#cpBody_contenido',
  file: '#cpBody_File1',
  send: '#cpBody_bSend',
};
const TEXT = [F.tracking, F.suplidor, F.contenido];

async function fieldState(sel: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLInputElement;
    const r = el.getBoundingClientRect();
    return {
      valueLen: el.value.length,
      valueStart: el.value.slice(0, 30),
      valid: el.checkValidity(),
      validationMessage: el.validationMessage,
      valueMissing: el.validity.valueMissing,
      typeMismatch: el.validity.typeMismatch,
      badInput: el.validity.badInput,
      rangeUnderflow: el.validity.rangeUnderflow,
      stepMismatch: el.validity.stepMismatch,
      width: Math.round(r.width),
      height: Math.round(r.height),
      scrollWidth: el.scrollWidth,
      scrollHeight: el.scrollHeight,
      docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  }, sel);
}
async function formValidity() {
  return page.evaluate(() => {
    const f = document.forms['frmBody'] as HTMLFormElement;
    const invalid = Array.from(f.querySelectorAll(':invalid')).map((e) => ({ id: e.id, msg: (e as HTMLInputElement).validationMessage }));
    return { valid: f.checkValidity(), invalid, noValidate: f.noValidate, blocked: (window as any).__blockedSubmit };
  });
}
async function reportAndCapture(name: string) {
  // reportValidity shows the native bubble on the first invalid control (no submit)
  const res = await page.evaluate(() => {
    const f = document.forms['frmBody'] as HTMLFormElement;
    const ok = f.reportValidity();
    return { ok, active: document.activeElement?.id, blocked: (window as any).__blockedSubmit };
  });
  await page.waitForTimeout(300);
  const sh = await shot(page, name, false);
  return { ...res, shot: sh };
}

// ---- Static attributes (TF-10, TF-12, FU-01, BT-02, AX-02) ----
const attrs = await page.evaluate(() => {
  const ids = ['cpBody_Tracking', 'cpBody_ClienteID', 'cpBody_FOB', 'cpBody_Transpos', 'cpBody_Suplidor', 'cpBody_contenido', 'cpBody_File1', 'cpBody_bSend', 'cpBody_TokenID'];
  return ids.map((id) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return { id, missing: true };
    const lbl = document.querySelector(`label[for="${id}"]`);
    // visible text immediately preceding the control (the "Tracking: *" style labels)
    const prev = el.closest('.form-group, .col-md-12, div')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 60);
    return {
      id,
      tag: el.tagName,
      type: el.getAttribute('type'),
      placeholder: el.getAttribute('placeholder'),
      required: el.hasAttribute('required'),
      maxlength: el.getAttribute('maxlength'),
      pattern: el.getAttribute('pattern'),
      min: el.getAttribute('min'),
      max: el.getAttribute('max'),
      step: el.getAttribute('step'),
      accept: el.getAttribute('accept'),
      multiple: el.hasAttribute('multiple'),
      disabled: el.disabled,
      readOnly: el.readOnly,
      tabindex: el.getAttribute('tabindex'),
      autofocus: el.hasAttribute('autofocus'),
      autocomplete: el.getAttribute('autocomplete'),
      ariaLabel: el.getAttribute('aria-label'),
      ariaLabelledby: el.getAttribute('aria-labelledby'),
      ariaDescribedby: el.getAttribute('aria-describedby'),
      ariaRequired: el.getAttribute('aria-required'),
      title: el.getAttribute('title'),
      labelFor: lbl ? lbl.textContent?.trim() : null,
      labelsCount: (el as any).labels?.length ?? null,
      onclick: el.getAttribute('onclick'),
      onchange: el.getAttribute('onchange'),
      value: id === 'cpBody_TokenID' || id === 'cpBody_ClienteID' || id === 'cpBody_bSend' ? el.value : undefined,
      visible: el.offsetParent !== null,
      containerText: prev,
      resize: el.tagName === 'TEXTAREA' ? getComputedStyle(el).resize : undefined,
    };
  });
});
const formInfo = await page.evaluate(() => {
  const f = document.forms['frmBody'] as HTMLFormElement;
  const inline = Array.from(document.querySelectorAll('script')).filter((x) => !x.src).map((x) => x.textContent || '');
  const all = inline.join('\n');
  return {
    action: f.getAttribute('action'),
    method: f.method,
    enctype: f.enctype,
    onsubmit: f.getAttribute('onsubmit'),
    noValidate: f.noValidate,
    pageValidators: (window as any).Page_Validators ? (window as any).Page_Validators.length : null,
    hasConfirmarFn: typeof (window as any).Confirmar === 'function',
    hasGuardarFn: typeof (window as any).Guardar === 'function',
    confirmarReferenced: /Confirmar\(/.test(all.replace(/function Confirmar\(/, '')),
    bSendHandlers: (() => { const b = document.getElementById('cpBody_bSend') as any; return { onclick: b.onclick ? String(b.onclick).slice(0, 200) : null, jq: (window as any).jQuery ? ((window as any).jQuery._data(b, 'events') ? Object.keys((window as any).jQuery._data(b, 'events')) : []) : 'no-jquery' }; })(),
    labelsInDom: document.querySelectorAll('label').length,
    asterisks: Array.from(document.querySelectorAll('.card-body, fieldset, form')).map((n) => (n as HTMLElement).innerText).join(' ').match(/\*/g)?.length,
    visibleLabelTexts: Array.from(document.querySelectorAll('.card-body *')).filter((n) => n.children.length === 0 && /\S/.test(n.textContent || '') && !['INPUT', 'SELECT', 'TEXTAREA', 'OPTION', 'SCRIPT'].includes(n.tagName)).map((n) => n.textContent?.replace(/\s+/g, ' ').trim()).slice(0, 25),
    fileFeedbackElements: document.querySelectorAll('[id*="File"] ~ *, .custom-file-label').length,
    bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1200),
  };
});
const attrsEv = saveEvidence('prealerta-form-attrs', { attrs, formInfo });
console.log(JSON.stringify({ attrs, formInfo }, null, 1));
await shot(page, 'prealerta-1440');

// TF-10 placeholder-only labels
const placeholderOnly = attrs.filter((a: any) => a.placeholder && !a.labelFor && !a.ariaLabel && !a.ariaLabelledby);
L(SC, 'TF-10', placeholderOnly.map((a: any) => '#' + a.id).join(', '), placeholderOnly.length ? 'fail' : 'pass', {
  findingIds: placeholderOnly.length ? ['PA-01'] : [],
  reason: `${placeholderOnly.length} campos sin <label for>/aria-label (labels en DOM=${formInfo.labelsInDom}); texto visible junto al campo: ${JSON.stringify(formInfo.visibleLabelTexts)}`,
  evidence: [attrsEv, 'audit/screenshots/prealerta-1440.png'],
});
L(SC, 'AX-02', 'campos con placeholder', placeholderOnly.length ? 'fail' : 'pass', { findingIds: placeholderOnly.length ? ['PA-01'] : [], reason: 'Ver TF-10', evidence: [attrsEv] });

// TF-12 disabled ClienteID
const cli = attrs.find((a: any) => a.id === 'cpBody_ClienteID') as any;
await page.locator(F.cliente).click({ force: true }).catch(() => {});
await page.keyboard.type('XYZ').catch(() => {});
const cliAfter = await page.evaluate(() => (document.getElementById('cpBody_ClienteID') as HTMLInputElement).value);
L(SC, 'TF-12', F.cliente, 'executed-static', {
  findingIds: ['PA-02'],
  reason: `disabled=${cli.disabled} required=${cli.required} value='${cli.value}' title=${cli.title} aria-describedby=${cli.ariaDescribedby}; tras teclear valor='${cliAfter}'; sin explicación visible; un input disabled no se envía en el POST`,
  evidence: [attrsEv],
});

// ---- TF-01 / BT-03: all required, empty → reportValidity ----
await load();
const v0 = await formValidity();
const rep0 = await reportAndCapture('prealerta-tf01-empty');
console.log('TF-01 empty', JSON.stringify(v0), JSON.stringify(rep0));
for (const sel of TEXT) {
  const st = await fieldState(sel);
  L(SC, 'TF-01', sel, st.valueMissing ? 'pass' : 'fail', { reason: `required nativo: valueMissing=${st.valueMissing} msg='${st.validationMessage}' (mensaje del navegador, no de la app)`, evidence: [rep0.shot] });
}
{
  const st = await fieldState(F.fob);
  L(SC, 'TF-01', F.fob, st.valueMissing ? 'pass' : 'fail', { reason: `required nativo: valueMissing=${st.valueMissing} msg='${st.validationMessage}'`, evidence: [rep0.shot] });
}
L(SC, 'BT-03', F.send + ' (reportValidity, sin clic)', rep0.ok === false ? 'pass' : 'fail', {
  reason: `Formulario inválido con campos vacíos: reportValidity=${rep0.ok}, foco en #${rep0.active}, inválidos=${v0.invalid.map((i) => i.id).join(',')}; sólo validación nativa HTML5 (Page_Validators=${formInfo.pageValidators}); POST bloqueados=${blockedPosts} submit interceptados=${rep0.blocked}`,
  findingIds: ['PA-03'],
  evidence: [rep0.shot, attrsEv],
});

// ---- TF-02 whitespace-only ----
for (const sel of TEXT) {
  await page.fill(sel, '   ');
  const st = await fieldState(sel);
  L(SC, 'TF-02', sel, st.valid ? 'fail' : 'pass', { findingIds: st.valid ? ['PA-04'] : [], reason: `'   ' → checkValidity=${st.valid} valueMissing=${st.valueMissing} (required nativo acepta espacios; sin trim/validación de la app)` });
}
{
  await page.fill(F.fob, '');
  await page.locator(F.fob).pressSequentially('   ').catch(() => {});
  const st = await fieldState(F.fob);
  L(SC, 'TF-02', F.fob, st.valid ? 'fail' : 'pass', { reason: `espacios en type=number → valor='${st.valueStart}' valid=${st.valid} valueMissing=${st.valueMissing}` });
}

// ---- TF-03 leading/trailing spaces (no submit → static) ----
for (const sel of TEXT) {
  await page.fill(sel, '  Juan  ');
  const st = await fieldState(sel);
  L(SC, 'TF-03', sel, 'executed-static', { reason: `'  Juan  ' se conserva tal cual en cliente (len=${st.valueLen}); trimming en servidor no verificable sin enviar` });
}

// ---- TF-04 excessive length ----
for (const sel of TEXT) {
  const rec: any = {};
  for (const [tag, val] of [['5k', LONG_5K], ['100k', LONG_100K]] as const) {
    const t0 = Date.now();
    await page.fill(sel, val);
    const st = await fieldState(sel);
    rec[tag] = { ms: Date.now() - t0, ...st };
  }
  const shotP = await shot(page, `prealerta-tf04-${sel.replace('#cpBody_', '')}`, false);
  const broken = rec['100k'].docOverflow || rec['100k'].ms > 5000;
  L(SC, 'TF-04', sel, broken ? 'fail' : 'executed-static', {
    findingIds: ['PA-05'],
    reason: `sin maxlength; 5k→len ${rec['5k'].valueLen} (${rec['5k'].ms}ms), 100k→len ${rec['100k'].valueLen} (${rec['100k'].ms}ms), overflow doc=${rec['100k'].docOverflow}, scrollW=${rec['100k'].scrollWidth}; límite sólo en servidor (no verificable)`,
    evidence: [shotP],
  });
}
{
  await page.fill(F.fob, '');
  await page.locator(F.fob).pressSequentially('9'.repeat(40));
  const st = await fieldState(F.fob);
  L(SC, 'TF-04', F.fob, 'executed-static', { findingIds: ['PA-06'], reason: `40 dígitos → valor='${st.valueStart}…' len=${st.valueLen} valid=${st.valid} (sin max)` });
}

// ---- TF-05 / TF-06 / TF-07 / TF-08 / TF-09 (client acceptance only) ----
for (const sel of TEXT) {
  const out: any = {};
  for (const [tag, val] of [['specials', SPECIALS], ['xss', XSS_PROBE], ['unicode', UNICODE], ...SQLISH.map((q, i) => [`sql${i}`, q] as const)] as const) {
    await page.fill(sel, val);
    const st = await fieldState(sel);
    out[tag] = { valid: st.valid, echoed: st.valueStart };
  }
  L(SC, 'TF-05', sel, 'executed-static', { reason: `Especiales/XSS aceptados en cliente (valid=${out.specials.valid}/${out.xss.valid}); sin validación de patrón; comportamiento servidor no probado (STATIC)` });
  L(SC, 'TF-06', sel, 'executed-static', { reason: `Unicode/emoji/RTL aceptado en cliente (valid=${out.unicode.valid}, valor='${out.unicode.echoed}'); persistencia no verificable` });
  L(SC, 'TF-07', sel, 'executed-static', { reason: `SQL/template aceptados en cliente (${SQLISH.map((_, i) => out['sql' + i].valid).join('/')}); servidor no probado` });
}
{
  await page.fill(F.tracking, 'abc!!##');
  const st = await fieldState(F.tracking);
  L(SC, 'TF-08', F.tracking, 'executed-static', { findingIds: ['PA-07'], reason: `Tracking acepta cualquier texto ('abc!!##' valid=${st.valid}); sin formato/patrón por transportista` });
}
L(SC, 'TF-08', F.suplidor + ', ' + F.contenido, 'omitted', { reason: 'No son campos nombre/ID con formato definido' });
for (const sel of [F.tracking, F.suplidor]) {
  await page.fill(sel, '');
  await page.focus(sel);
  await page.keyboard.insertText('línea1\nlínea2\nlínea3');
  const st = await fieldState(sel);
  L(SC, 'TF-09', sel, 'executed-static', { reason: `Pegado multilínea en input de una línea → valor='${st.valueStart.replace(/\n/g, '\\n')}' (len ${st.valueLen}); saltos eliminados por el navegador` });
}
{
  await page.fill(F.contenido, '');
  await page.focus(F.contenido);
  await page.keyboard.insertText('párrafo '.repeat(400));
  const st = await fieldState(F.contenido);
  L(SC, 'TF-09', F.contenido, 'executed-static', { reason: `Pegado largo en textarea: len=${st.valueLen} scrollH=${st.scrollHeight} h=${st.height}` });
}

// ---- TF-11 textarea newlines ----
{
  await page.fill(F.contenido, Array.from({ length: 120 }, (_, i) => `línea ${i + 1}`).join('\n'));
  const st = await fieldState(F.contenido);
  const ta = attrs.find((a: any) => a.id === 'cpBody_contenido') as any;
  const shotP = await shot(page, 'prealerta-tf11-textarea', false);
  L(SC, 'TF-11', F.contenido, st.docOverflow ? 'fail' : 'pass', { reason: `120 líneas: alto=${st.height}px scrollH=${st.scrollHeight} resize=${ta.resize} overflow doc=${st.docOverflow}; rows por defecto`, evidence: [shotP] });
}

// ---- Number field NM-01..05 ----
await load();
const nm: any = {};
for (const [tag, val] of [['neg', '-100'], ['zero', '0'], ['big', '1e309'], ['huge', '99999999999999999999'], ['dec', '12.345678'], ['sci', '1e5'], ['currency', '$1,234.50'], ['alpha', 'abc']] as const) {
  await page.fill(F.fob, '');
  await page.locator(F.fob).pressSequentially(val).catch(() => {});
  nm[tag] = await fieldState(F.fob);
}
// paste non-numeric
await page.fill(F.fob, '');
await page.focus(F.fob);
await page.keyboard.insertText('abc');
nm.pasteAlpha = await fieldState(F.fob);
const nmEv = saveEvidence('prealerta-fob-probes', nm);
console.log('NM', JSON.stringify(nm, null, 0));
L(SC, 'NM-01', F.fob, nm.neg.valid ? 'fail' : 'pass', { findingIds: nm.neg.valid ? ['PA-06'] : [], reason: `-100 → valid=${nm.neg.valid} rangeUnderflow=${nm.neg.rangeUnderflow} (sin min)`, evidence: [nmEv] });
L(SC, 'NM-02', F.fob, nm.zero.valid ? 'fail' : 'pass', { findingIds: nm.zero.valid ? ['PA-06'] : [], reason: `0 → valid=${nm.zero.valid} (valor declarado 0 aceptado)`, evidence: [nmEv] });
L(SC, 'NM-03', F.fob, nm.pasteAlpha.valueLen === 0 || nm.pasteAlpha.badInput ? 'pass' : 'fail', { reason: `pegar 'abc' → valor='${nm.pasteAlpha.valueStart}' badInput=${nm.pasteAlpha.badInput} valid=${nm.pasteAlpha.valid}; teclear 'abc' → '${nm.alpha.valueStart}'`, evidence: [nmEv] });
L(SC, 'NM-04', F.fob, nm.huge.valid && nm.big.valid ? 'fail' : 'executed-static', { findingIds: ['PA-06'], reason: `1e309 → valid=${nm.big.valid} badInput=${nm.big.badInput}; 20 dígitos → valid=${nm.huge.valid}; 12.345678 → valid=${nm.dec.valid} (step=any, sin max ni 2 decimales); 1e5 → valid=${nm.sci.valid}`, evidence: [nmEv] });
L(SC, 'NM-05', F.fob, 'executed-static', { findingIds: ['PA-06'], reason: `'$1,234.50' → valor='${nm.currency.valueStart}' badInput=${nm.currency.badInput}; etiqueta 'Valor Declarado(USD)' sin máscara/ayuda de formato`, evidence: [nmEv] });

// ---- Select SL-01 / SL-05 / SL-07 ----
const selInfo = await page.evaluate(() => {
  const s = document.getElementById('cpBody_Transpos') as HTMLSelectElement;
  return { options: Array.from(s.options).map((o) => ({ v: o.value, t: o.text })), selectedIndex: s.selectedIndex, value: s.value, required: s.required, valid: s.checkValidity(), hasPlaceholder: Array.from(s.options).some((o) => o.value === '' || /selec/i.test(o.text)) };
});
L(SC, 'SL-01', F.transpos, selInfo.hasPlaceholder ? 'pass' : 'fail', { findingIds: selInfo.hasPlaceholder ? [] : ['PA-08'], reason: `Sin opción placeholder; preseleccionado '${selInfo.options[selInfo.selectedIndex]?.t}' (value=${selInfo.value}); required=${selInfo.required} valid=${selInfo.valid} → el usuario puede enviar sin elegir transportista conscientemente` });
await page.focus(F.transpos);
await page.keyboard.press('ArrowDown');
const afterArrow = await page.evaluate(() => (document.getElementById('cpBody_Transpos') as HTMLSelectElement).value);
await page.keyboard.type('D');
const afterType = await page.evaluate(() => (document.getElementById('cpBody_Transpos') as HTMLSelectElement).selectedOptions[0].text);
L(SC, 'SL-05', F.transpos, afterArrow !== selInfo.value ? 'pass' : 'fail', { reason: `Teclado: ArrowDown → value ${selInfo.value}→${afterArrow}; tecla 'D' → '${afterType}'; sin label asociado (AX-02)` });
const inj = await page.evaluate(() => {
  const s = document.getElementById('cpBody_Transpos') as HTMLSelectElement;
  const o = document.createElement('option'); o.value = '999'; o.text = 'INJECTED'; s.appendChild(o); s.value = '999';
  return { value: s.value, valid: s.checkValidity() };
});
L(SC, 'SL-07', F.transpos, 'executed-static', { reason: `Opción fuera de lista inyectada → value=${inj.value} valid=${inj.valid} en cliente; rechazo en servidor no verificable sin enviar (STATIC)` });

// ---- FU-01 file upload (setInputFiles, no submit) ----
await load();
const fu: any = { attrs: attrs.find((a: any) => a.id === 'cpBody_File1') };
for (const [tag, file] of [['txt', 'fixture-1kb.txt'], ['pdf', 'fixture-invoice.pdf'], ['exe', 'fixture-fake.pdf.exe']] as const) {
  await page.setInputFiles(F.file, path.join(FIX, file));
  await page.waitForTimeout(400);
  fu[tag] = await page.evaluate(() => {
    const el = document.getElementById('cpBody_File1') as HTMLInputElement;
    const f = el.files?.[0];
    return { name: f?.name, size: f?.size, type: f?.type, valid: el.checkValidity(), msg: el.validationMessage, feedbackText: (el.parentElement?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120), swalOpen: !!document.querySelector('.swal-overlay--show-modal, .swal2-container'), blocked: (window as any).__blockedSubmit };
  });
}
const fuEv = saveEvidence('prealerta-file-probes', fu);
const fuShot = await shot(page, 'prealerta-fu01', false);
L(SC, 'FU-01', F.file, 'executed-static', {
  findingIds: ['PA-09'],
  reason: `accept=${fu.attrs.accept} multiple=${fu.attrs.multiple} required=${fu.attrs.required}; .txt/.pdf/.exe aceptados en cliente (valid=${fu.txt.valid}/${fu.pdf.valid}/${fu.exe.valid}); sin límite de tamaño ni feedback (${fu.exe.feedbackText}); no enviado (POST bloqueados=${blockedPosts})`,
  evidence: [fuEv, fuShot],
});

// ---- Grid TB-01 / TB-08 ----
const grid = await page.evaluate(() => {
  const g = document.querySelector('#cpBody_gvDatos');
  return { empty: document.querySelector('#cpBody_gvDatos [id*="DXEmptyRow"]')?.textContent?.trim(), ths: g?.querySelectorAll('th').length, role: g?.getAttribute('role'), headers: Array.from(document.querySelectorAll('#cpBody_gvDatos td[class*="dxgvHeader"]')).map((h) => h.textContent?.trim()).filter(Boolean), lang: document.documentElement.lang };
});
L(SC, 'TB-01', '#cpBody_gvDatos (vacío)', 'fail', { findingIds: ['PA-10'], reason: `Estado vacío = '${grid.empty}' (texto por defecto DevExpress en inglés, html lang='${grid.lang}'); sin guía al usuario`, evidence: ['audit/screenshots/prealerta-1440.png'] });
L(SC, 'TB-08', '#cpBody_gvDatos', grid.ths === 0 ? 'fail' : 'pass', { findingIds: grid.ths === 0 ? ['EC-02'] : [], reason: `th=${grid.ths} role=${grid.role}; cabeceras ${grid.headers.join('/')} (patrón EC-02)` });

// ---- Buttons BT-02 / BT-06 / BT-07 / BT-11 ----
L(SC, 'BT-02', F.send + ' [STATIC]', 'executed-static', {
  findingIds: ['PA-03'],
  reason: `input type=submit sin onclick (${JSON.stringify(formInfo.bSendHandlers)}), form onsubmit=${formInfo.onsubmit}; Confirmar() definido pero no referenciado (${formInfo.confirmarReferenced}); sin confirmación ni disable-on-click; Enter en cualquier campo envía el formulario`,
  evidence: [attrsEv],
});
L(SC, 'BT-06', F.send, 'pass', { reason: `Botón con texto visible '${(attrs.find((a: any) => a.id === 'cpBody_bSend') as any).value}'; iconos del chrome compartido son de otro grupo` });
L(SC, 'BT-07', F.send + ' [STATIC]', 'executed-static', { findingIds: ['PA-03'], reason: 'Sin mecanismo de feedback/spinner/deshabilitado en el DOM ni en JS (inspección estática, no se hizo clic)' });
await load();
const stops = await tabTraverse(page, 40);
const stopsEv = saveEvidence('prealerta-tab-order', stops);
const formStops = stops.filter((x) => x && /cpBody_/.test(x.id)).map((x) => `${x.id}(ti=${x.tabindex})`);
console.log('tab order', formStops.join(' > '));
const visualOrder = ['cpBody_Tracking', 'cpBody_FOB', 'cpBody_Transpos', 'cpBody_Suplidor', 'cpBody_contenido', 'cpBody_File1', 'cpBody_bSend'];
const actualOrder = stops.filter((x) => x && visualOrder.includes(x.id)).map((x) => x.id);
const orderOk = JSON.stringify(actualOrder) === JSON.stringify(visualOrder);
L(SC, 'BT-11', 'PreAlerta.aspx (Tab)', orderOk ? 'pass' : 'fail', { findingIds: orderOk ? [] : ['PA-11'], reason: `Orden real: ${actualOrder.join(' > ')} (tabindex 1/2/2/4/2/5/2); esperado visual: ${visualOrder.join(' > ')}`, evidence: [stopsEv] });
L(SC, 'AX-04', 'PreAlerta.aspx (Tab)', orderOk ? 'pass' : 'fail', { findingIds: orderOk ? [] : ['PA-11'], reason: 'Ver BT-11', evidence: [stopsEv] });

// ---- CC-01 / CC-03 ----
L(SC, 'CC-01', 'PreAlerta.aspx', 'executed-static', { findingIds: ['PA-12'], reason: `Textos: ${formInfo.bodyText.slice(0, 500)}`, evidence: [attrsEv] });
const msgs = await page.evaluate(() => ['cpBody_Tracking', 'cpBody_FOB', 'cpBody_Suplidor', 'cpBody_contenido', 'cpBody_File1', 'cpBody_Transpos'].map((id) => ({ id, msg: (document.getElementById(id) as HTMLInputElement).validationMessage })));
L(SC, 'CC-03', 'mensajes de validación', 'executed-static', { findingIds: ['PA-03'], reason: `Únicos mensajes: nativos del navegador ${JSON.stringify(msgs)}; la app no define mensajes propios`, evidence: [rep0.shot] });

console.log(`safety: blocked POSTs=${blockedPosts}, intercepted submits=${await page.evaluate(() => (window as any).__blockedSubmit)}`);
await s.close();
console.log('done');
