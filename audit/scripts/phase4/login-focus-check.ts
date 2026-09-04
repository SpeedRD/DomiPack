// Correction pass for focus-indicator checks (see notes/focus-styles-read-mid-transition.md):
// focus each control, wait 600 ms for Bootstrap transitions, compare against the blurred state.
import { startSession, logCase, saveEvidence, shot, BASE_URL } from '../../support/phase4.ts';
const s = await startSession({ name: 'p4-login-focus-check', auth: false });
const page = s.page;
await s.context.route('**/*', (route) => (route.request().method() === 'POST' ? route.abort('blockedbyclient') : route.continue()));

const READ = `(sel) => { var el = document.querySelector(sel); if (!el) return null; var cs = getComputedStyle(el); return { outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, boxShadow: cs.boxShadow, border: cs.borderColor, bg: cs.backgroundColor }; }`;
function isIndicator(blur: any, foc: any) {
  if (!blur || !foc) return false;
  const shadowReal = foc.boxShadow !== 'none' && !/rgba\(\d+, \d+, \d+, 0\)/.test(foc.boxShadow) && !/ 0px 0px 0px 0px/.test(foc.boxShadow);
  const outlineReal = !/^none/.test(foc.outline);
  return shadowReal || outlineReal || foc.border !== blur.border || foc.bg !== blur.bg;
}
async function check(screen: string, url: string, sels: string[], shotName: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const rows: any[] = [];
  for (const sel of sels) {
    await page.evaluate(`(document.activeElement || {}).blur && document.activeElement.blur()`);
    await page.waitForTimeout(500);
    const blur = await page.evaluate(`(${READ})(${JSON.stringify(sel)})`);
    const ok = await page.focus(sel).then(() => true).catch(() => false);
    await page.waitForTimeout(600);
    const foc = ok ? await page.evaluate(`(${READ})(${JSON.stringify(sel)})`) : null;
    rows.push({ sel, focusable: ok, blur, foc, indicator: isIndicator(blur, foc) });
  }
  await page.focus(sels[0]); await page.waitForTimeout(600); await shot(page, shotName, false);
  console.log(screen, JSON.stringify(rows, null, 0));
  return rows;
}
const login = await check('Login', `${BASE_URL}/Login.aspx`, ['#lUser', '#lPass', '#checkbox-signup', 'a[onclick="login()"]', 'a[onclick="Recuperar();"]', 'a[href="NuevaCuenta.aspx"]'], 'login-focus-lUser');
const nc = await check('Nueva Cuenta', `${BASE_URL}/NuevaCuenta.aspx`, ['#ddTipo', '#Identificacion', '#Nombre', '#sSexo', '#Email', '#lSucursal', '#ckDomicilio', '#cbMedioiD', '#ckRua', '#bSend'], 'nueva-cuenta-focus-Nombre');
const ev = saveEvidence('focus-check-corrected', { login, nuevaCuenta: nc });
const noL = login.filter((r) => r.focusable && !r.indicator).map((r) => r.sel);
const noN = nc.filter((r) => r.focusable && !r.indicator).map((r) => r.sel);
logCase({ group: 'login', screen: 'Login', caseId: 'BT-11', instance: 'CORRECTION foco tras 600 ms (transiciones)', result: noL.length ? 'fail' : 'pass', findingIds: noL.length ? ['LG-10'] : [], reason: `sin indicador de foco: ${noL.join(', ') || 'ninguno'}; con indicador: ${login.filter((r) => r.indicator).map((r) => r.sel).join(', ')}`, evidence: [ev, 'audit/screenshots/login-focus-lUser.png'] });
logCase({ group: 'login', screen: 'Nueva Cuenta', caseId: 'BT-11', instance: 'CORRECTION foco tras 600 ms (transiciones)', result: noN.length ? 'fail' : 'pass', findingIds: noN.length ? ['NC-13'] : [], reason: `sin indicador de foco: ${noN.join(', ') || 'ninguno'}; con indicador: ${nc.filter((r) => r.indicator).map((r) => r.sel).join(', ')}`, evidence: [ev, 'audit/screenshots/nueva-cuenta-focus-Nombre.png'] });
await s.close();
console.log('DONE focus-check');
