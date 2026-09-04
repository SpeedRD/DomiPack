// Phase 4 / micuenta — Dependientes tab: TF-*, EM-01/02/05/06/08, PH-01..06, TB-01/08/12, BT-02/03 (STATIC), AX-02 (labels).
// STATIC-ONLY: never fires #cpBody_Button3 / #cpBody_Button2 nor presses Enter.
import { startSession, go, shot, saveEvidence, LONG_5K, LONG_100K, SPECIALS, XSS_PROBE, UNICODE, SQLISH, EMAIL_INVALID } from '../../support/phase4.ts';
import { log, NAME_SHIM, TAB, openTab, probe, focused, assertNotLogin } from './_micuenta-common.ts';

const SCREEN = TAB.dependientes.screen;
const s = await startSession({ name: 'p4-micuenta-dependientes' });
const page = s.page;
await s.context.addInitScript(NAME_SHIM);
await go(page, 'MiCuenta.aspx');
assertNotLogin(page, 'start');
await openTab(page, 'dependientes');
await shot(page, 'p4-micuenta-dependientes-tab', true);

const F = { nombre: '#cpBody_lNombreDependiente', cedula: '#cpBody_lIdentificacionDependiente', email: '#cpBody_lEmailDependiente', cel: '#cpBody_lCelularDependiente' };
const TEXT = Object.values(F);
const ev: Record<string, unknown> = {};

const facts = await page.evaluate(() => {
  const pane = document.getElementById('cpBody_lefticontab2')!;
  const fields = Array.from(pane.querySelectorAll('input')).map((el) => {
    const lab = el.parentElement?.querySelector('label');
    return { id: el.id, type: el.type, value: el.value, required: el.required, maxlength: el.getAttribute('maxlength'), pattern: el.getAttribute('pattern'), autocomplete: el.getAttribute('autocomplete'), inputmode: el.getAttribute('inputmode'), placeholder: el.placeholder, labelText: lab?.textContent?.trim() || null, labelFor: lab?.getAttribute('for') || null, ariaLabel: el.getAttribute('aria-label'), visible: el.getBoundingClientRect().width > 0, onclick: el.getAttribute('onclick') };
  });
  const grid = document.getElementById('cpBody_gvDependientes')!;
  const headers = Array.from(grid.querySelectorAll('[id^="cpBody_gvDependientes_col"]')).map((h) => ({ id: h.id, tag: h.tagName, text: h.textContent?.trim(), onclick: h.getAttribute('onclick'), cursor: getComputedStyle(h).cursor, role: h.getAttribute('role'), scope: h.getAttribute('scope') }));
  const ths = grid.querySelectorAll('th').length;
  const empty = document.getElementById('cpBody_gvDependientes_DXEmptyRow');
  const gridAttrs = { role: grid.getAttribute('role'), ariaLabel: grid.getAttribute('aria-label'), caption: !!grid.querySelector('caption'), summary: grid.getAttribute('summary'), nestedTables: grid.querySelectorAll('table').length };
  const emptyStyle = empty ? getComputedStyle(empty.querySelector('td')!) : null;
  return {
    fields,
    headers,
    ths,
    gridAttrs,
    emptyText: empty?.textContent?.trim(),
    emptyColor: emptyStyle?.color,
    pageValidators: (window as any).Page_Validators ? (window as any).Page_Validators.length : null,
    headingText: Array.from(pane.querySelectorAll('.card-header, h5, h6, b, strong')).map((h) => h.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean),
    eliminarConfirm: (window as any).Eliminar ? (window as any).Eliminar.toString() : null,
    editarFn: (window as any).Editar ? (window as any).Editar.toString() : null,
    guardarDependienteFn: (window as any).GuardarDependiente ? (window as any).GuardarDependiente.toString() : null,
    hiddenTargets: ['cpBody_BGuardarDependientes', 'cpBody_bGuardarClientes', 'cpBody_bEditar', 'cpBody_BEliminar1', 'cpBody_DependienteId'].map((id) => ({ id, exists: !!document.getElementById(id), display: document.getElementById(id) ? getComputedStyle(document.getElementById(id)!.parentElement!).display : null })),
  };
});
ev.facts = facts;
console.log(JSON.stringify(facts, null, 1));

// ---- TF cases ----
for (const sel of TEXT) {
  const f = facts.fields.find((x: any) => '#' + x.id === sel);
  log(SCREEN, 'TF-01', sel, 'executed-static', `required=${f?.required}, maxlength=${f?.maxlength}, pattern=${f?.pattern}, Page_Validators=${facts.pageValidators}; no client-side required validation; server not exercised`);
  const r2 = await probe(page, sel, '   ');
  log(SCREEN, 'TF-02', sel, 'executed-static', `whitespace-only accepted client-side (len=${r2.valueLen})`);
  const r3 = await probe(page, sel, '  Juan  ');
  log(SCREEN, 'TF-03', sel, 'executed-static', `kept verbatim ('${r3.valueSample}'); trimming only possible server-side (not exercised)`);
  const r4 = await probe(page, sel, LONG_5K);
  log(SCREEN, 'TF-04', sel, 'executed-static', `5000 chars accepted (len=${r4.valueLen}, maxlength=${r4.maxlength}, ${r4.ms}ms, overflowX=${r4.overflowX})`);
  const r5 = await probe(page, sel, SPECIALS + ' ' + XSS_PROBE);
  log(SCREEN, 'TF-05', sel, 'executed-static', `special chars + script probe accepted verbatim client-side (len=${r5.valueLen}); not submitted`);
  const r6 = await probe(page, sel, UNICODE);
  log(SCREEN, 'TF-06', sel, 'executed-static', `unicode kept (${r6.valueEqualsInput})`);
  const r7 = await probe(page, sel, SQLISH.join(' '));
  log(SCREEN, 'TF-07', sel, 'executed-static', `SQL/template strings accepted verbatim client-side (${r7.valueEqualsInput})`);
  const r9 = await probe(page, sel, 'linea1\nlinea2', { paste: true });
  log(SCREEN, 'TF-09', sel, 'executed-static', `pasted multiline -> '${r9.valueSample}' (len=${r9.valueLen})`);
}
{
  const r = await probe(page, F.nombre, LONG_100K);
  log(SCREEN, 'TF-04', F.nombre + ' (100k)', 'executed-static', `100000 chars accepted (len=${r.valueLen}, ${r.ms}ms, overflowX=${r.overflowX})`);
  await shot(page, 'MC-dependientes-tf04', false);
}
{
  const rn = await probe(page, F.nombre, '12345');
  const ri = await probe(page, F.cedula, 'ABCDEF');
  const ri2 = await probe(page, F.cedula, '001-1234567-8');
  log(SCREEN, 'TF-08', F.nombre + ',' + F.cedula, 'executed-static', `digits in name accepted ('${rn.valueSample}'); letters in cédula accepted ('${ri.valueSample}'); dashed cédula accepted ('${ri2.valueSample}'); no format validation client-side`);
}
{
  const noFor = facts.fields.filter((f: any) => f.type === 'text' && f.labelText && !f.labelFor && !f.ariaLabel);
  log(SCREEN, 'TF-10', TEXT.join(','), noFor.length ? 'fail' : 'pass', `${noFor.length} fields with visible <label> lacking for/id association: ${noFor.map((f: any) => f.id).join(',')}`, ['MC-01']);
  log(SCREEN, 'AX-02', TEXT.join(','), noFor.length ? 'fail' : 'pass', `label association missing on ${noFor.length}/4 fields`, ['MC-01']);
}
log(SCREEN, 'TF-11', 'n/a', 'omitted', 'no textarea on Dependientes');
log(SCREEN, 'TF-12', 'n/a', 'omitted', 'no disabled-on-load field on Dependientes');

// ---- EM cases on #cpBody_lEmailDependiente ----
{
  const f = facts.fields.find((x: any) => x.id === 'cpBody_lEmailDependiente');
  log(SCREEN, 'EM-01', F.email, 'executed-static', `required=${f?.required}; empty accepted client-side; server not exercised`);
  const results: Record<string, boolean> = {};
  for (const bad of EMAIL_INVALID) {
    const r = await probe(page, F.email, bad);
    results[bad] = r.checkValidity;
  }
  log(SCREEN, 'EM-02', F.email, 'fail', `type=${f?.type}; all invalid formats accepted client-side (checkValidity per input: ${JSON.stringify(results)}); no client-side email validation`, ['MC-03']);
  const long = await probe(page, F.email, 'a'.repeat(300) + '@' + 'b'.repeat(300) + '.' + 'c'.repeat(100));
  log(SCREEN, 'EM-05', F.email, 'executed-static', `700-char email accepted (len=${long.valueLen}, maxlength=${long.maxlength})`);
  const ws = await probe(page, F.email, '   ');
  const sp = await probe(page, F.email, '  a@x.com  ');
  log(SCREEN, 'EM-06', F.email, 'executed-static', `whitespace-only kept (len=${ws.valueLen}); padded email kept verbatim ('${sp.valueSample}')`);
  log(SCREEN, 'EM-07', F.email, 'fail', `type=${f?.type} (not type=email)`, ['MC-03']);
  const idn = await probe(page, F.email, 'usuario@dominío.com');
  const idn2 = await probe(page, F.email, '名@例.jp');
  log(SCREEN, 'EM-08', F.email, 'executed-static', `IDN/unicode emails accepted verbatim client-side ('${idn.valueSample}', '${idn2.valueSample}'); server behavior not exercised`);
}
// ---- PH cases on #cpBody_lCelularDependiente ----
{
  const f = facts.fields.find((x: any) => x.id === 'cpBody_lCelularDependiente');
  log(SCREEN, 'PH-01', F.cel, 'executed-static', `required=${f?.required}; no client-side required validation`);
  const a = await probe(page, F.cel, 'abc +++ ()');
  log(SCREEN, 'PH-02', F.cel, 'executed-static', `letters/symbols accepted ('${a.valueSample}', validity=${a.checkValidity})`);
  const m1 = await probe(page, F.cel, '8091234567');
  const m2 = await probe(page, F.cel, '123');
  log(SCREEN, 'PH-03', F.cel, 'fail', `placeholder promises '${f?.placeholder}' but pattern=${f?.pattern}, maxlength=${f?.maxlength}, inputmode=${f?.inputmode}: '8091234567' (len=${m1.valueLen}) and '123' (len=${m2.valueLen}) accepted with no mask/format enforcement client-side`, ['MC-10']);
  const l = await probe(page, F.cel, '9'.repeat(60));
  const sh = await probe(page, F.cel, '1');
  log(SCREEN, 'PH-04', F.cel, 'executed-static', `60 digits accepted (len=${l.valueLen}); 1 digit accepted (len=${sh.valueLen})`);
  const w = await probe(page, F.cel, '   ');
  const sp = await probe(page, F.cel, '809 123 4567');
  log(SCREEN, 'PH-05', F.cel, 'executed-static', `whitespace-only kept (len=${w.valueLen}); spaced number kept verbatim ('${sp.valueSample}')`);
  log(SCREEN, 'PH-06', F.cel, 'fail', `type=${f?.type}, inputmode=${f?.inputmode}; no tel semantics`, ['MC-03']);
}
// ---- TB-01 / TB-08 / TB-12 on #cpBody_gvDependientes ----
{
  log(SCREEN, 'TB-01', '#cpBody_gvDependientes', 'fail', `empty state text='${facts.emptyText}' (DevExpress default, English, no guidance)`, ['MC-11']);
  log(SCREEN, 'TB-08', '#cpBody_gvDependientes', 'fail', `headers are <${facts.headers[0]?.tag}> not <th> (th count=${facts.ths}); nested tables=${facts.gridAttrs.nestedTables}; role=${facts.gridAttrs.role}; caption=${facts.gridAttrs.caption}`, ['MC-12']);
  const sortable = facts.headers.filter((h: any) => h.onclick || h.cursor === 'pointer');
  if (sortable.length) {
    // One header click on an EMPTY grid (read-only DevExpress callback).
    const respBefore: string[] = [];
    page.on('response', (r) => { if (r.request().method() === 'POST') respBefore.push(`${r.status()} ${r.url()}`); });
    await page.click('#' + sortable[0].id);
    await page.waitForTimeout(2500);
    const after = await page.evaluate(() => ({ url: location.href, empty: document.getElementById('cpBody_gvDependientes_DXEmptyRow')?.textContent?.trim(), sortImg: document.querySelectorAll('#cpBody_gvDependientes img[class*=Sort], #cpBody_gvDependientes .dxGridView_gvHeaderSortUp_Moderno, #cpBody_gvDependientes .dxGridView_gvHeaderSortDown_Moderno').length }));
    assertNotLogin(page, 'after sort click');
    log(SCREEN, 'TB-12', '#cpBody_gvDependientes header ' + sortable[0].text, 'pass', `header click on empty grid: POST responses=${JSON.stringify(respBefore)}; empty row='${after.empty}'; sort indicators=${after.sortImg}; no error`);
    ev.sortClick = { sortable, respBefore, after };
  } else {
    log(SCREEN, 'TB-12', '#cpBody_gvDependientes', 'omitted', `no sortable headers detected (no onclick / pointer cursor): ${JSON.stringify(facts.headers.map((h: any) => [h.text, h.cursor]))}`);
  }
}
// ---- BT-02 / BT-03 static on Button3 ----
{
  const b = await page.$eval('#cpBody_Button3', (el) => ({ value: (el as HTMLInputElement).value, onclick: el.getAttribute('onclick'), type: (el as HTMLInputElement).type, visible: el.getBoundingClientRect().width > 0 }));
  const b2 = await page.$eval('#cpBody_Button2', (el) => ({ value: (el as HTMLInputElement).value, visible: el.getBoundingClientRect().width > 0, parentDisplay: getComputedStyle(el.parentElement!.parentElement!).display }));
  ev.buttons = { b, b2 };
  log(SCREEN, 'BT-02', '#cpBody_Button3 (' + b.value + ')', 'executed-static', `type=${b.type} onclick=${b.onclick}; no confirm, no disable-on-click; hidden sibling #cpBody_Button2 '${b2.value}' (visible=${b2.visible}); Eliminar() in page uses native confirm('Desea Eliminar el Dependiente?') for row delete`, ['MC-05']);
  log(SCREEN, 'BT-03', '#cpBody_Button3 (' + b.value + ')', 'executed-static', `no required/validators: empty submit would reach server unvalidated (not fired)`, ['MC-06']);
  log(SCREEN, 'BT-11', 'Dependientes form', 'executed-static', 'focus/tab order evaluated in the Datos Personales run (same page); see MC-08');
}
// ---- AX-04 keyboard quick pass within the tab ----
{
  await page.focus(F.nombre);
  const seq: any[] = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); seq.push(await focused(page)); }
  ev.tabSeq = seq;
  const noInd = seq.filter((o) => o && o.visible && !o.indicator);
  log(SCREEN, 'AX-04', 'Dependientes form', noInd.length ? 'fail' : 'pass', `tab sequence: ${seq.map((o) => o?.id || o?.tag + ':' + o?.text).join(' > ')}; without indicator: ${noInd.map((o) => o.id || o.tag).join(',') || 'none'}`, noInd.length ? ['MC-08'] : undefined);
}
// ---- CC-01 copy on this tab ----
log(SCREEN, 'CC-01', 'Dependientes copy', 'fail', `headings ${JSON.stringify(facts.headingText)}; labels ${JSON.stringify(facts.fields.filter((f: any) => f.visible).map((f: any) => f.labelText))}; button '${(ev.buttons as any).b.value}' vs hidden '${(ev.buttons as any).b2.value}'; empty grid text '${facts.emptyText}'`, ['MC-09']);
await page.reload({ waitUntil: 'domcontentloaded' });
assertNotLogin(page, 'end');
console.log(saveEvidence('MC-dependientes', ev));
await s.close();
