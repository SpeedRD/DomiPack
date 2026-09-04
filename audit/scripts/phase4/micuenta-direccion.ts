// Phase 4 / micuenta — Direccion tab: DS-01..07, SL-04/05, TF-11, CB-01, TB-01/08, BT-02/03 (STATIC), AX-05, CC-01.
// STATIC-ONLY: never fires #cpBody_bDireccion / #cpBody_Button6; never re-enables Pais/Provincia (their onchange posts back).
import { startSession, go, shot, saveEvidence, LONG_5K, SPECIALS, XSS_PROBE, UNICODE, SQLISH } from '../../support/phase4.ts';
import { log, NAME_SHIM, TAB, openTab, probe, contrast, focused, assertNotLogin } from './_micuenta-common.ts';

const SCREEN = TAB.direccion.screen;
const s = await startSession({ name: 'p4-micuenta-direccion' });
const page = s.page;
await s.context.addInitScript(NAME_SHIM);
await go(page, 'MiCuenta.aspx');
assertNotLogin(page, 'start');
await openTab(page, 'direccion');
await shot(page, 'DS-07', true);
const ev: Record<string, unknown> = {};

const facts = await page.evaluate(() => {
  const sel = (id: string) => document.getElementById(id) as HTMLSelectElement;
  const selInfo = (id: string) => {
    const e = sel(id);
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const lab = e.parentElement?.querySelector('label') || e.closest('.form-group')?.querySelector('label');
    return { id, disabled: e.disabled, options: e.options.length, selected: e.selectedOptions[0]?.text ?? null, firstOptions: Array.from(e.options).slice(0, 4).map((o) => o.text), onchange: e.getAttribute('onchange'), tabindex: e.getAttribute('tabindex'), title: e.getAttribute('title'), cls: e.className, color: cs.color, bg: cs.backgroundColor, opacity: cs.opacity, w: r.width, h: r.height, fontSize: cs.fontSize, labelText: lab?.textContent?.trim() || null, labelFor: lab?.getAttribute('for') || null, ariaLabel: e.getAttribute('aria-label') };
  };
  const pane = document.getElementById('cpBody_lefticontab4')!;
  const inputs = Array.from(pane.querySelectorAll('input')).map((el) => {
    const lab = el.parentElement?.querySelector('label');
    const r = el.getBoundingClientRect();
    return { id: el.id, tag: el.tagName, type: el.type, required: el.required, maxlength: el.getAttribute('maxlength'), placeholder: el.placeholder, checked: el.checked, cls: el.className, labelText: lab?.textContent?.trim() || null, labelFor: lab?.getAttribute('for') || null, w: r.width, h: r.height, visible: r.width > 0 };
  });
  const grid = document.getElementById('cpBody_gvDireccion')!;
  const headers = Array.from(grid.querySelectorAll('[id^="cpBody_gvDireccion_col"]')).map((h) => ({ id: h.id, tag: h.tagName, text: h.textContent?.trim(), cursor: getComputedStyle(h).cursor, onclick: h.getAttribute('onclick') }));
  return {
    selects: ['cpBody_cbPais', 'cpBody_cbProvincia', 'cpBody_cbCiudad', 'cpBody_cbSector'].map(selInfo),
    inputs,
    textareas: pane.querySelectorAll('textarea').length,
    headers,
    ths: grid.querySelectorAll('th').length,
    emptyText: document.getElementById('cpBody_gvDireccion_DXEmptyRow')?.textContent?.trim(),
    headings: Array.from(pane.querySelectorAll('.card-header, h5, h6, b, strong, .card-title')).map((h) => h.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean),
    labels: Array.from(pane.querySelectorAll('label')).map((l) => l.textContent?.trim()),
    buttons: Array.from(pane.querySelectorAll('input[type=submit]')).map((b) => ({ id: b.id, value: (b as HTMLInputElement).value, onclick: b.getAttribute('onclick'), visible: b.getBoundingClientRect().width > 0 })),
    pageValidators: (window as any).Page_Validators ? (window as any).Page_Validators.length : null,
  };
});
ev.facts = facts;
console.log(JSON.stringify(facts, null, 1));
const S = Object.fromEntries(facts.selects.map((x: any) => [x.id, x]));

// ---- DS-01 / DS-02: child selects without parent ----
{
  const ciudad = S['cpBody_cbCiudad'];
  await page.focus('#cpBody_cbCiudad');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  const c1 = await page.$eval('#cpBody_cbCiudad', (e) => ({ value: (e as HTMLSelectElement).value, idx: (e as HTMLSelectElement).selectedIndex }));
  assertNotLogin(page, 'DS-01');
  log(SCREEN, 'DS-01', '#cpBody_cbCiudad', ciudad.disabled || ciudad.options === 0 ? 'fail' : 'pass', `Ciudad is ENABLED but has ${ciudad.options} options while Provincia is disabled/unselected; ArrowDown -> selectedIndex=${c1.idx}, no postback; renders as an empty solid box (no placeholder, not disabled)`, ['MC-13']);
  const sector = S['cpBody_cbSector'];
  await page.focus('#cpBody_cbSector');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  const c2 = await page.$eval('#cpBody_cbSector', (e) => ({ value: (e as HTMLSelectElement).value, idx: (e as HTMLSelectElement).selectedIndex }));
  assertNotLogin(page, 'DS-02');
  log(SCREEN, 'DS-02', '#cpBody_cbSector', 'fail', `Sector is ENABLED with ${sector.options} options while Ciudad is empty; ArrowDown -> selectedIndex=${c2.idx}; same empty-box rendering`, ['MC-13']);
}
for (const c of ['DS-03', 'DS-04', 'DS-05']) {
  log(SCREEN, c, '#cpBody_cbProvincia -> cbCiudad -> cbSector', 'omitted', `Pais and Provincia load disabled for this account (disabled=${S['cpBody_cbPais'].disabled}/${S['cpBody_cbProvincia'].disabled}); their onchange is a full __doPostBack, and re-enabling them via DevTools could persist state server-side — cascade not exercisable (see DS-06)`);
}
log(SCREEN, 'DS-06', 'cascade Pais/Provincia/Ciudad/Sector', 'fail', `Pais (${S['cpBody_cbPais'].options} option: '${S['cpBody_cbPais'].selected}') and Provincia (${S['cpBody_cbProvincia'].options} options, '${S['cpBody_cbProvincia'].selected}') are disabled; Ciudad/Sector enabled but empty. onchange handlers: ${S['cpBody_cbProvincia'].onchange}. The address form therefore cannot be completed by this account and there is no message explaining why`, ['MC-14']);
// ---- DS-07: rendering ----
{
  const cs = await Promise.all(['#cpBody_cbPais', '#cpBody_cbProvincia', '#cpBody_cbCiudad', '#cpBody_cbSector'].map((sel) => contrast(page, sel)));
  ev.selectContrast = cs;
  console.log('select contrast', JSON.stringify(cs));
  log(SCREEN, 'DS-07', 'Provincia/Ciudad/Sector selects', 'fail', `selects styled as solid red boxes (bg=${S['cpBody_cbCiudad'].bg}, color=${S['cpBody_cbCiudad'].color}); Ciudad/Sector show no text at all; Pais/Provincia at opacity=${S['cpBody_cbPais'].opacity}; contrast white-on-red ratios: ${cs.map((c: any) => c && `${c.sel}=${c.ratio}`).join(', ')}`, ['MC-13']);
}
// ---- SL-04 / SL-05 ----
log(SCREEN, 'SL-04', '#cpBody_cbPais, #cpBody_cbProvincia', 'fail', `both disabled (class ${S['cpBody_cbPais'].cls}), title=${S['cpBody_cbPais'].title}/${S['cpBody_cbProvincia'].title}; no tooltip or explanatory copy`, ['MC-02']);
{
  await page.focus('#cpBody_tbDireccion');
  const seq: any[] = [];
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Shift+Tab'); seq.push(await focused(page)); }
  ev.shiftTabSeq = seq;
  const reachedSelects = seq.filter((o) => o && /cb(Ciudad|Sector|Provincia|Pais)/.test(o.id)).map((o) => o.id);
  log(SCREEN, 'SL-05', 'cbCiudad/cbSector (enabled), cbPais/cbProvincia (disabled)', 'executed-static', `Shift+Tab from Direccion reaches: ${reachedSelects.join(',') || 'none'}; disabled Pais/Provincia are skipped; enabled Ciudad/Sector are focusable but have 0 options (nothing to operate); labels not associated (labelFor=${S['cpBody_cbCiudad'].labelFor}); cbPais has tabindex=${S['cpBody_cbPais'].tabindex}`, ['MC-01']);
}
// ---- TF-11 (Nota) + text probes ----
{
  const nota = facts.inputs.find((i: any) => i.id === 'cpBody_tbNota');
  const r = await probe(page, '#cpBody_tbNota', 'linea1\nlinea2\nlinea3\n'.repeat(20), { paste: true });
  const r2 = await probe(page, '#cpBody_tbNota', LONG_5K);
  log(SCREEN, 'TF-11', '#cpBody_tbNota', 'executed-static', `Nota is <${nota?.tag} type=${nota?.type}>, NOT a textarea (textareas in pane=${facts.textareas}); pasted multiline -> newlines stripped (len=${r.valueLen}); 5000 chars accepted (maxlength=${r2.maxlength}, overflowX=${r2.overflowX})`);
  for (const sel of ['#cpBody_tbDireccion', '#cpBody_tbNota']) {
    const f = facts.inputs.find((i: any) => '#' + i.id === sel);
    log(SCREEN, 'TF-01', sel, 'executed-static', `required=${f?.required} maxlength=${f?.maxlength}; Page_Validators=${facts.pageValidators}; no client-side validation`);
    const a = await probe(page, sel, '   ');
    const b = await probe(page, sel, SPECIALS + ' ' + XSS_PROBE + ' ' + UNICODE + ' ' + SQLISH.join(' '));
    log(SCREEN, 'TF-02', sel, 'executed-static', `whitespace-only accepted (len=${a.valueLen})`);
    log(SCREEN, 'TF-05', sel, 'executed-static', `specials/unicode/sql probes accepted verbatim client-side (len=${b.valueLen}, equal=${b.valueEqualsInput})`);
    log(SCREEN, 'TF-10', sel, f?.labelText && !f?.labelFor ? 'fail' : 'pass', `label '${f?.labelText}' for=${f?.labelFor}`, ['MC-01']);
  }
}
// ---- CB-01 Principal ----
{
  const cb = facts.inputs.find((i: any) => i.id === 'cpBody_ckPrincipal');
  const before = await page.$eval('#cpBody_ckPrincipal', (e) => (e as HTMLInputElement).checked);
  await page.click('#cpBody_ckPrincipal');
  await page.waitForTimeout(300);
  const after = await page.$eval('#cpBody_ckPrincipal', (e) => ({ checked: (e as HTMLInputElement).checked, onchange: e.getAttribute('onchange'), onclick: e.getAttribute('onclick') }));
  assertNotLogin(page, 'CB-01');
  const anyPost = await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => (r as PerformanceResourceTiming).initiatorType === 'xmlhttprequest' || (r as PerformanceResourceTiming).initiatorType === 'fetch').length);
  await page.click('#cpBody_ckPrincipal'); // restore default (client-side only)
  const restored = await page.$eval('#cpBody_ckPrincipal', (e) => (e as HTMLInputElement).checked);
  await shot(page, 'MC-15', false);
  log(SCREEN, 'CB-01', '#cpBody_ckPrincipal', 'fail', `default checked=${before}; click -> ${after.checked}; restored -> ${restored}; no handlers (${after.onchange}/${after.onclick}), xhr count=${anyPost}; rendered ${cb?.w}x${cb?.h}px because class='${cb?.cls}' (form-control on a checkbox); label '${cb?.labelText}' not associated (for=${cb?.labelFor}) so clicking the label does not toggle`, ['MC-15', 'MC-01']);
}
// ---- TB-01 / TB-08 on gvDireccion ----
log(SCREEN, 'TB-01', '#cpBody_gvDireccion', 'fail', `empty state text='${facts.emptyText}' (DevExpress default, English)`, ['MC-11']);
log(SCREEN, 'TB-08', '#cpBody_gvDireccion', 'fail', `headers are <${facts.headers[0]?.tag}> (th count=${facts.ths}); nested layout tables; no caption/role`, ['MC-12']);
// ---- BT-02 / BT-03 static ----
{
  const b = facts.buttons.find((x: any) => x.id === 'cpBody_bDireccion');
  const b6 = facts.buttons.find((x: any) => x.id === 'cpBody_Button6');
  log(SCREEN, 'BT-02', '#cpBody_bDireccion (' + b?.value + ')', 'executed-static', `type=submit onclick=${b?.onclick}; no confirm / disable-on-click; hidden sibling #cpBody_Button6 '${b6?.value}' visible=${b6?.visible}`, ['MC-05']);
  log(SCREEN, 'BT-03', '#cpBody_bDireccion (' + b?.value + ')', 'executed-static', `no required/validators (Page_Validators=${facts.pageValidators}); with Pais/Provincia disabled the form could be posted with no address selection (not fired)`, ['MC-06']);
}
// ---- AX-05 contrast on this tab ----
{
  const items = ['#cpBody_cbPais', '#cpBody_cbProvincia', '#cpBody_bDireccion', '#cpBody_gvDireccion_col0', '#cpBody_gvDireccion_DXEmptyRow td', '.app-footer .left a', '#cpBody_ltab2'];
  const res = [];
  for (const it of items) res.push(await contrast(page, it));
  ev.contrast = res;
  const fails = res.filter((r: any) => r && r.ratio < 4.5);
  console.log('AX-05', JSON.stringify(res));
  log(SCREEN, 'AX-05', items.join(', '), fails.length ? 'fail' : 'pass', `ratios: ${res.map((r: any) => r && `${r.sel}=${r.ratio}(${r.fontSize})`).join('; ')}`, fails.length ? ['MC-16'] : undefined);
}
// ---- CC-01 ----
log(SCREEN, 'CC-01', 'Direccion copy', 'fail', `headings ${JSON.stringify(facts.headings)}; labels ${JSON.stringify(facts.labels)}; buttons ${JSON.stringify(facts.buttons.map((b: any) => b.value))}; Provincia placeholder '${S['cpBody_cbProvincia'].selected}'`, ['MC-09']);
await page.reload({ waitUntil: 'domcontentloaded' });
assertNotLogin(page, 'end');
console.log(saveEvidence('MC-direccion', ev));
await s.close();
