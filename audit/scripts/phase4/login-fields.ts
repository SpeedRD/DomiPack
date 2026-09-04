// Phase 4 — Login.aspx: text/password fields, checkbox, buttons (non-real-login cases),
// keyboard, copy, axe, NV-05. Real successful logins only in throwaway contexts.
// NEVER calls Recuperar() (real email). Password values never written to evidence.
import { Page, BrowserContext } from 'playwright';
import {
  startSession, shot, runAxe, logCase, saveEvidence, saveText, serverErrorSignature, visibleText,
  BASE_URL, LONG_5K, LONG_100K, SPECIALS, XSS_PROBE, UNICODE, SQLISH, attachErrorBodyCapture,
} from '../../support/phase4.ts';
import { attachCapture } from '../../support/capture.ts';

const GROUP = 'login';
const SCREEN = 'Login';
const LOGIN = `${BASE_URL}/Login.aspx`;
const USER = process.env.DP_USERNAME || 'DP-014003';
const PASS = process.env.DP_PASSWORD || '';
if (!PASS) throw new Error('DP_PASSWORD missing');

const s = await startSession({ name: 'p4-login-fields', auth: false });
const page = s.page;

// ---- POST bookkeeping (redacted: never store values of lPass) ----
type PostRec = { url: string; keys: string[]; lUserLen: number; lPassLen: number; hasCheckbox: boolean; hasRecuperar: boolean; ts: number };
function attachPostLog(p: Page): PostRec[] {
  const posts: PostRec[] = [];
  p.on('request', (r) => {
    if (r.method() !== 'POST' || !/Login\.aspx/i.test(r.url())) return;
    const pd = r.postData() || '';
    const params = new URLSearchParams(pd);
    const keys = Array.from(params.keys());
    posts.push({
      url: r.url(), keys,
      lUserLen: (params.get('lUser') || '').length,
      lPassLen: (params.get('lPass') || '').length,
      hasCheckbox: keys.some((k) => /checkbox/i.test(k)),
      hasRecuperar: keys.includes('bRecuperar'),
      ts: Date.now(),
    });
  });
  return posts;
}
const posts = attachPostLog(page);

const BASELINE_TEXT = 'Iniciar sesión Remember me Entrar Recuperar mi Contraseña? Crear Cuenta Gratis';
function delta(text: string): string {
  return text.replace(BASELINE_TEXT, '').replace(/\s+/g, ' ').trim();
}

interface Attempt {
  label: string; user: string; pass: string; uncheckRemember?: boolean; submitVia?: 'click' | 'enterInPass' | 'enterOnLink';
}
interface AttemptResult {
  label: string; posted: boolean; postCount: number; status?: number; finalUrl: string; message: string; swal: string;
  serverError: string | null; userAfter: string; passAfterLen: number; rememberAfter: boolean | null; ms: number;
  userValidity?: { valueMissing: boolean; valid: boolean }; activeAfter?: string; title: string; buttonDisabledDuring?: boolean;
}
async function attempt(p: Page, a: Attempt, postLog: PostRec[] = posts): Promise<AttemptResult> {
  await p.goto(LOGIN, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(300);
  await p.fill('#lUser', a.user);
  await p.fill('#lPass', a.pass);
  if (a.uncheckRemember) {
    await p.click('label[for="checkbox-signup"]');
    const st = await p.isChecked('#checkbox-signup');
    if (st) await p.evaluate(`document.getElementById('checkbox-signup').checked = false`);
  }
  const before = postLog.length;
  const t0 = Date.now();
  const respP = p.waitForResponse((r) => r.request().method() === 'POST' && /Login\.aspx/i.test(r.url()), { timeout: 45000 }).catch(() => null);
  if (a.submitVia === 'enterInPass') {
    await p.focus('#lPass');
    await p.keyboard.press('Enter');
  } else if (a.submitVia === 'enterOnLink') {
    await p.focus('a[onclick="login()"]');
    await p.keyboard.press('Enter');
  } else {
    await p.click('a[onclick="login()"]');
  }
  // feedback during request
  const btnState = await p.evaluate(() => {
    const a = document.querySelector('a[onclick="login()"]') as HTMLElement;
    return { cls: a.className, ariaDisabled: a.getAttribute('aria-disabled'), pointer: getComputedStyle(a).pointerEvents, blockUI: !!document.querySelector('.blockUI'), preloader: !!document.querySelector('.se-pre-con') };
  }).catch(() => null);
  const resp = await respP;
  await p.waitForLoadState('domcontentloaded').catch(() => {});
  await p.waitForTimeout(1200);
  const ms = Date.now() - t0;
  const text = await visibleText(p).catch(() => '');
  const html = await p.content().catch(() => '');
  const state = await p.evaluate(() => {
    const u = document.getElementById('lUser') as HTMLInputElement | null;
    const pw = document.getElementById('lPass') as HTMLInputElement | null;
    const cb = document.getElementById('checkbox-signup') as HTMLInputElement | null;
    const sw = document.querySelector('.swal2-container') as HTMLElement | null;
    return {
      userAfter: u?.value ?? '(no field)', passAfterLen: pw?.value.length ?? -1, rememberAfter: cb ? cb.checked : null,
      swal: sw ? (sw.innerText || '').replace(/\s+/g, ' ').trim() : '',
      userValidity: u ? { valueMissing: u.validity.valueMissing, valid: u.validity.valid } : undefined,
      active: document.activeElement?.id || document.activeElement?.tagName || '',
      title: document.title,
    };
  }).catch(() => ({ userAfter: '?', passAfterLen: -1, rememberAfter: null, swal: '', userValidity: undefined, active: '', title: '' }));
  const r: AttemptResult = {
    label: a.label, posted: postLog.length > before, postCount: postLog.length - before, status: resp?.status(), finalUrl: p.url(),
    message: delta(text), swal: state.swal, serverError: serverErrorSignature(html), userAfter: state.userAfter, passAfterLen: state.passAfterLen,
    rememberAfter: state.rememberAfter, ms, userValidity: state.userValidity, activeAfter: state.active, title: state.title,
    buttonDisabledDuring: btnState ? btnState.ariaDisabled === 'true' || btnState.pointer === 'none' || btnState.blockUI : undefined,
  };
  console.log('ATTEMPT', JSON.stringify({ ...r, message: r.message.slice(0, 200), swal: r.swal.slice(0, 200) }));
  return r;
}

const results: Record<string, AttemptResult> = {};
const findings: string[] = [];

// ---------- baseline attributes ----------
await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
const attrs: any = await page.evaluate(`(() => {
  var q = function (id) { return document.getElementById(id); };
  var u = q('lUser'), pw = q('lPass'), cb = q('checkbox-signup');
  var lab = function (el) { return { labels: Array.from(el.labels || []).map(function (l) { return (l.textContent || '').trim(); }), ariaLabel: el.getAttribute('aria-label'), ariaLabelledby: el.getAttribute('aria-labelledby'), placeholder: el.placeholder, title: el.title }; };
  var ea = document.querySelector('a[onclick="login()"]');
  var ra = document.querySelector('a[onclick="Recuperar();"]');
  return {
    lUser: Object.assign({ required: u.required, maxLength: u.maxLength, autocomplete: u.getAttribute('autocomplete'), type: u.type }, lab(u)),
    lPass: Object.assign({ required: pw.required, maxLength: pw.maxLength, autocomplete: pw.getAttribute('autocomplete'), type: pw.type }, lab(pw)),
    checkbox: { name: cb.getAttribute('name'), checked: cb.checked, defaultChecked: cb.defaultChecked, labels: Array.from(cb.labels || []).map(function (l) { return (l.textContent || '').trim(); }) },
    revealToggle: !!document.querySelector('[class*="eye"], [class*="toggle-password"], [data-toggle="password"], button[aria-label*="contraseñ" i], button[aria-label*="password" i]'),
    entrar: { tag: ea.tagName, href: ea.getAttribute('href'), role: ea.getAttribute('role'), text: (ea.textContent || '').trim(), tabindex: ea.tabIndex },
    recuperar: { tag: ra.tagName, href: ra.getAttribute('href'), text: (ra.textContent || '').trim() },
    logoHref: (document.querySelector('a.logo') || { getAttribute: function () { return null; } }).getAttribute('href'),
    footerPresent: !!document.querySelector('footer'),
    bodyText: (document.body.innerText || '').replace(/\\s+/g, ' ').trim(),
    lang: document.documentElement.lang,
    hiddenSubmits: Array.from(document.querySelectorAll('input[type=submit]')).map(function (e) { return { id: e.id, display: getComputedStyle(e).display, formnovalidate: e.formNoValidate }; }),
    formNovalidate: document.forms[0].noValidate
  };
})()`);
saveEvidence('login-baseline-attrs', attrs);
console.log('BASELINE', JSON.stringify(attrs));

// TF-10 / AX-02: placeholder-only labels
const noLabelUser = attrs.lUser.labels.length === 0 && !attrs.lUser.ariaLabel && !attrs.lUser.ariaLabelledby;
const noLabelPass = attrs.lPass.labels.length === 0 && !attrs.lPass.ariaLabel && !attrs.lPass.ariaLabelledby;
await page.fill('#lUser', 'texto'); await page.fill('#lPass', 'texto'); await page.focus('a[onclick="login()"]');
await shot(page, 'LG-01');
logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-10', instance: '#lUser', result: noLabelUser ? 'fail' : 'pass', findingIds: noLabelUser ? ['LG-01'] : [], reason: `labels=${JSON.stringify(attrs.lUser.labels)} aria-label=${attrs.lUser.ariaLabel}`, evidence: ['audit/screenshots/LG-01.png'] });
logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-10', instance: '#lPass', result: noLabelPass ? 'fail' : 'pass', findingIds: noLabelPass ? ['LG-01'] : [], reason: `labels=${JSON.stringify(attrs.lPass.labels)}` });
logCase({ group: GROUP, screen: SCREEN, caseId: 'AX-02', instance: '#lUser/#lPass', result: noLabelUser || noLabelPass ? 'fail' : 'pass', findingIds: ['LG-01'], reason: 'placeholder-only; no <label for>/aria-label' });

// PW-06 reveal + autocomplete
logCase({ group: GROUP, screen: SCREEN, caseId: 'PW-06', instance: '#lPass', result: 'executed-static', findingIds: ['LG-02'], reason: `revealToggle=${attrs.revealToggle} autocomplete(lPass)=${attrs.lPass.autocomplete} autocomplete(lUser)=${attrs.lUser.autocomplete}` });

// TF-11 / TF-12 / TF-08 not applicable on Login
logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-08', instance: '#lUser', result: 'omitted', reason: 'No es campo de nombre/cédula/RNC; el usuario es un código de cuenta (DP-xxxxxx).' });
logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-11', instance: '(textarea)', result: 'omitted', reason: 'Login no tiene textarea.' });
logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-12', instance: '(disabled fields)', result: 'omitted', reason: 'Login no tiene campos deshabilitados al cargar.' });

// ---------- TF-01: lUser empty ----------
results['TF-01'] = await attempt(page, { label: 'TF-01 empty user', user: '', pass: 'x' });
await shot(page, 'login-TF-01-empty-user');
{
  const r = results['TF-01'];
  const blocked = !r.posted && r.userValidity?.valueMissing === true;
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-01', instance: '#lUser', result: blocked ? 'pass' : 'fail', reason: `posted=${r.posted} valueMissing=${r.userValidity?.valueMissing} active=${r.activeAfter} (native browser bubble only; no DOM message)`, evidence: ['audit/screenshots/login-TF-01-empty-user.png'] });
}

// ---------- PW-01: password empty ----------
results['PW-01'] = await attempt(page, { label: 'PW-01 empty pass', user: USER, pass: '' });
await shot(page, 'LG-03');
{
  const r = results['PW-01'];
  // lPass has no `required` -> the form POSTs with an empty password
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PW-01', instance: '#lPass', result: r.posted ? 'fail' : 'pass', findingIds: r.posted ? ['LG-03'] : [], reason: `posted=${r.posted} status=${r.status} msg="${r.message.slice(0, 120)}" swal="${r.swal.slice(0, 120)}"`, evidence: ['audit/screenshots/LG-03.png'] });
}

// ---------- PW-02: wrong password (valid user) vs unknown user ----------
results['PW-02a'] = await attempt(page, { label: 'PW-02 wrong pass valid user', user: USER, pass: 'contrasena-incorrecta-123' });
await shot(page, 'login-PW-02-wrong-pass');
results['PW-02b'] = await attempt(page, { label: 'PW-02 unknown user', user: 'ZZ-999999-NOEXISTE', pass: 'contrasena-incorrecta-123' });
await shot(page, 'login-PW-02-unknown-user');
{
  const a = results['PW-02a'], b = results['PW-02b'];
  const msgA = a.message + ' | ' + a.swal, msgB = b.message + ' | ' + b.swal;
  const same = msgA === msgB;
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PW-02', instance: '#lPass', result: 'executed-static', findingIds: ['LG-04'], reason: `wrong-pass msg="${msgA.slice(0, 150)}" unknown-user msg="${msgB.slice(0, 150)}" sameMessage=${same} userKept=${a.userAfter !== ''} passCleared=${a.passAfterLen === 0} remember=${a.rememberAfter}` , evidence: ['audit/screenshots/login-PW-02-wrong-pass.png', 'audit/screenshots/login-PW-02-unknown-user.png'] });
}

// ---------- TF-02: whitespace-only user ----------
results['TF-02'] = await attempt(page, { label: 'TF-02 whitespace user', user: '   ', pass: 'x' });
{
  const r = results['TF-02'];
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-02', instance: '#lUser', result: r.posted ? 'fail' : 'pass', findingIds: r.posted ? ['LG-03'] : [], reason: `whitespace passes required (posted=${r.posted}) status=${r.status} msg="${(r.message + ' ' + r.swal).slice(0, 120)}"` });
}

// ---------- TF-03: leading/trailing spaces around VALID user (fresh context; may log in) ----------
async function freshCtx(sub: string): Promise<{ ctx: BrowserContext; p: Page; posts: PostRec[] }> {
  const ctx = await s.browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-DO' });
  const p = await ctx.newPage();
  attachCapture(p, `p4-login-fields-${sub}`);
  attachErrorBodyCapture(p, `p4-login-fields-${sub}`);
  return { ctx, p, posts: attachPostLog(p) };
}
{
  const f = await freshCtx('tf03');
  const r = await attempt(f.p, { label: 'TF-03 padded valid user + correct pass', user: `  ${USER}  `, pass: PASS }, f.posts);
  // wait for possible redirect
  await f.p.waitForURL((u) => !/Login\.aspx/i.test(u.href), { timeout: 30000 }).catch(() => {});
  const loggedIn = !/Login\.aspx/i.test(f.p.url());
  results['TF-03'] = { ...r, finalUrl: f.p.url() };
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-03', instance: '#lUser', result: 'executed-static', reason: `padded user -> loggedIn=${loggedIn} finalUrl=${f.p.url()} msg="${(r.message + ' ' + r.swal).slice(0, 100)}" (documenta trim silencioso o rechazo)` });
  await f.p.close(); await f.ctx.close();
}
results['TF-03-pass'] = await attempt(page, { label: 'TF-03 padded password', user: USER, pass: ` ${PASS} ` });
await page.waitForURL((u) => !/Login\.aspx/i.test(u.href), { timeout: 20000 }).catch(() => {});
{
  const loggedIn = !/Login\.aspx/i.test(page.url());
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-03', instance: '#lPass', result: 'executed-static', reason: `padded password -> loggedIn=${loggedIn} msg="${(results['TF-03-pass'].message + ' ' + results['TF-03-pass'].swal).slice(0, 100)}"` });
  if (loggedIn) throw new Error('Unexpected: padded password logged in on main context — stop to avoid session hazard');
}

// ---------- TF-04: excessive length ----------
results['TF-04-5k'] = await attempt(page, { label: 'TF-04 5k user', user: LONG_5K, pass: 'x' });
await shot(page, 'login-TF-04-5k');
results['TF-04-100k'] = await attempt(page, { label: 'TF-04 100k user', user: LONG_100K, pass: 'x' });
await shot(page, 'login-TF-04-100k');
{
  const a = results['TF-04-5k'], b = results['TF-04-100k'];
  const bad = a.serverError || b.serverError || (b.status && b.status >= 500) || (a.status && a.status >= 500);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-04', instance: '#lUser', result: bad ? 'fail' : 'pass', findingIds: bad ? ['LG-05'] : [], reason: `5k: status=${a.status} err=${a.serverError} msg="${(a.message + a.swal).slice(0, 80)}" | 100k: status=${b.status} err=${b.serverError} msg="${(b.message + b.swal).slice(0, 80)}" maxlength=${attrs.lUser.maxLength}`, evidence: ['audit/screenshots/login-TF-04-5k.png', 'audit/screenshots/login-TF-04-100k.png'] });
}

// ---------- TF-05: special chars / script ----------
results['TF-05-specials'] = await attempt(page, { label: 'TF-05 specials', user: SPECIALS, pass: 'x' });
await shot(page, 'login-TF-05-specials');
results['TF-05-xss'] = await attempt(page, { label: 'TF-05 script probe', user: XSS_PROBE, pass: 'x' });
await shot(page, 'login-TF-05-script');
{
  const a = results['TF-05-specials'], b = results['TF-05-xss'];
  const bad = a.serverError || b.serverError || (a.status ?? 0) >= 500 || (b.status ?? 0) >= 500;
  if (bad) findings.push('LG-05');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-05', instance: '#lUser', result: bad ? 'fail' : 'pass', findingIds: bad ? ['LG-05'] : [], reason: `specials: status=${a.status} err=${a.serverError} msg="${(a.message + a.swal).slice(0, 80)}" | script: status=${b.status} err=${b.serverError} msg="${(b.message + b.swal).slice(0, 80)}"`, evidence: ['audit/screenshots/login-TF-05-specials.png', 'audit/screenshots/login-TF-05-script.png'] });
}

// ---------- TF-06: unicode ----------
results['TF-06'] = await attempt(page, { label: 'TF-06 unicode', user: UNICODE, pass: 'x' });
await shot(page, 'login-TF-06-unicode');
{
  const r = results['TF-06'];
  const mojibake = /Ã|â€|\?\?/.test(r.userAfter) || /Ã|â€/.test(r.message);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-06', instance: '#lUser', result: r.serverError || mojibake ? 'fail' : 'pass', reason: `status=${r.status} echoed="${r.userAfter.slice(0, 40)}" msg="${(r.message + r.swal).slice(0, 80)}" mojibake=${mojibake}`, evidence: ['audit/screenshots/login-TF-06-unicode.png'] });
}

// ---------- TF-07: SQL-ish / template-ish ----------
{
  const outs: string[] = [];
  let bad = false;
  for (const probe of SQLISH) {
    const r = await attempt(page, { label: `TF-07 ${probe}`, user: probe, pass: 'x' });
    results[`TF-07 ${probe}`] = r;
    if (r.serverError || (r.status ?? 0) >= 500) bad = true;
    outs.push(`${probe} -> ${r.status} msg="${(r.message + r.swal).slice(0, 60)}" echoed="${r.userAfter.slice(0, 20)}"`);
  }
  await shot(page, 'login-TF-07-sqlish');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-07', instance: '#lUser', result: bad ? 'fail' : 'pass', findingIds: bad ? ['LG-05'] : [], reason: outs.join(' | '), evidence: ['audit/screenshots/login-TF-07-sqlish.png'] });
}

// ---------- TF-09: paste multiline ----------
await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
await page.focus('#lUser');
await page.keyboard.insertText('linea1\nlinea2\r\nlinea3');
{
  const v = await page.inputValue('#lUser');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-09', instance: '#lUser', result: 'pass', reason: `insertText multiline -> value="${v}" (saltos de línea eliminados por el navegador: ${!/\n/.test(v)})` });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'TF-09', instance: '#lPass', result: 'pass', reason: 'input type=password: mismo comportamiento nativo (single-line); no se probó por separado' });
}

// ---------- PW-03: 10k password ----------
results['PW-03'] = await attempt(page, { label: 'PW-03 10k pass', user: USER, pass: 'p'.repeat(10000) });
{
  const r = results['PW-03'];
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PW-03', instance: '#lPass', result: r.serverError || (r.status ?? 0) >= 500 ? 'fail' : 'pass', reason: `status=${r.status} err=${r.serverError} ms=${r.ms} msg="${(r.message + r.swal).slice(0, 80)}"` });
}

// ---------- PW-04: specials / unicode / whitespace-only / padded ----------
{
  const variants: [string, string][] = [['specials', SPECIALS], ['unicode', UNICODE], ['whitespace', '     '], ['script', XSS_PROBE]];
  const outs: string[] = []; let bad = false;
  for (const [n, v] of variants) {
    const r = await attempt(page, { label: `PW-04 ${n}`, user: USER, pass: v });
    results[`PW-04 ${n}`] = r;
    if (r.serverError || (r.status ?? 0) >= 500) bad = true;
    outs.push(`${n}: status=${r.status} posted=${r.posted} err=${r.serverError} msg="${(r.message + r.swal).slice(0, 60)}"`);
  }
  await shot(page, 'login-PW-04');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'PW-04', instance: '#lPass', result: bad ? 'fail' : 'pass', findingIds: bad ? ['LG-05'] : [], reason: outs.join(' | ') + ' | padded: ver TF-03 #lPass', evidence: ['audit/screenshots/login-PW-04.png'] });
}

// ---------- CB-01: remember me ----------
{
  const rOn = await attempt(page, { label: 'CB-01 checked', user: USER, pass: 'contrasena-incorrecta-123' });
  const pOn = posts[posts.length - 1];
  const rOff = await attempt(page, { label: 'CB-01 unchecked', user: USER, pass: 'contrasena-incorrecta-123', uncheckRemember: true });
  const pOff = posts[posts.length - 1];
  await shot(page, 'LG-06');
  const ev = saveEvidence('LG-06-postdata-keys', { checkboxHasName: attrs.checkbox.name, defaultChecked: attrs.checkbox.defaultChecked, postKeysChecked: pOn?.keys, postKeysUnchecked: pOff?.keys, checkboxInPost: pOn?.hasCheckbox || pOff?.hasCheckbox, rememberAfterFailedLogin: rOn.rememberAfter, rememberAfterUnchecked: rOff.rememberAfter, cookiesAfter: (await page.context().cookies()).map((c) => ({ name: c.name, expires: c.expires, httpOnly: c.httpOnly, secure: c.secure })) });
  const noEffect = !attrs.checkbox.name && !(pOn?.hasCheckbox || pOff?.hasCheckbox);
  logCase({ group: GROUP, screen: SCREEN, caseId: 'CB-01', instance: '#checkbox-signup', result: noEffect ? 'fail' : 'pass', findingIds: noEffect ? ['LG-06'] : [], reason: `name=${attrs.checkbox.name} defaultChecked=${attrs.checkbox.defaultChecked} inPOST=${pOn?.hasCheckbox || pOff?.hasCheckbox} keys=${JSON.stringify(pOn?.keys)}`, evidence: ['audit/screenshots/LG-06.png', ev] });
}

// ---------- BT-05: keyboard operability of Entrar (<a href="#" onclick>) ----------
await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
await page.evaluate(`(() => { window.__loginCalls = 0; var orig = window.login; window.login = function () { window.__loginCalls++; return orig(); }; })()`);
const entrarRole = await page.getByRole('link', { name: 'Entrar' }).count();
const entrarButtonRole = await page.getByRole('button', { name: 'Entrar' }).count();
await page.fill('#lUser', ''); // empty -> native validation blocks the hidden submit, so no POST
const beforeKb = posts.length;
await page.focus('a[onclick="login()"]');
const focusedIsEntrar = await page.evaluate(() => document.activeElement?.textContent?.trim() === 'Entrar');
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
const callsAfterEnter = await page.evaluate(() => (window as any).__loginCalls);
await page.focus('a[onclick="login()"]');
await page.keyboard.press('Space');
await page.waitForTimeout(500);
const callsAfterSpace = await page.evaluate(() => (window as any).__loginCalls);
const hashAfter = page.url();
{
  const spaceWorks = callsAfterSpace > callsAfterEnter;
  const r = { entrarRoleLink: entrarRole, entrarRoleButton: entrarButtonRole, focusable: focusedIsEntrar, enterActivates: callsAfterEnter >= 1, spaceActivates: spaceWorks, postsDuring: posts.length - beforeKb, urlAfter: hashAfter };
  saveEvidence('LG-07-keyboard-entrar', r);
  console.log('BT-05', JSON.stringify(r));
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-05', instance: 'Entrar (a[onclick=login()])', result: spaceWorks && entrarButtonRole > 0 ? 'pass' : 'fail', findingIds: ['LG-07'], reason: `role=link(${entrarRole}) button(${entrarButtonRole}) Enter=${r.enterActivates} Space=${r.spaceActivates} focusable=${r.focusable} href=# urlAfter=${hashAfter}`, evidence: ['audit/logs/evidence/LG-07-keyboard-entrar.json'] });
}
// implicit submission: Enter inside #lPass
{
  const r = await attempt(page, { label: 'Enter in lPass', user: USER, pass: 'contrasena-incorrecta-123', submitVia: 'enterInPass' });
  results['enterInPass'] = r;
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-05', instance: 'Enter dentro de #lPass (implicit submission)', result: r.posted ? 'pass' : 'fail', reason: `posted=${r.posted} (submit implícito vía #blogin oculto)` });
}

// ---------- BT-07: feedback after click ----------
{
  const r = results['PW-02a'];
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-07', instance: 'Entrar', result: 'executed-static', findingIds: ['LG-08'], reason: `during POST: buttonDisabled=${r.buttonDisabledDuring}; ver login-loading.ts para el caso de login correcto (4-20s)` });
}

// ---------- BT-10: Crear Cuenta Gratis + logo link + footer ----------
await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
await page.click('text=Crear Cuenta Gratis');
await page.waitForLoadState('domcontentloaded');
const crearUrl = page.url();
const logoResp = await page.request.get(`${BASE_URL}/${attrs.logoHref}`, { maxRedirects: 0 }).catch(() => null);
const logoBody = logoResp ? await logoResp.text() : '';
const logoInfo = { href: attrs.logoHref, status: logoResp?.status(), location: logoResp?.headers()['location'], title: /<title>([^<]*)<\/title>/i.exec(logoBody)?.[1], serverError: serverErrorSignature(logoBody) };
saveEvidence('LG-09-logo-link', logoInfo);
console.log('BT-10', crearUrl, JSON.stringify(logoInfo));
logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-10', instance: 'Crear Cuenta Gratis', result: /NuevaCuenta\.aspx/i.test(crearUrl) ? 'pass' : 'fail', reason: `navigated to ${crearUrl}` });
logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-10', instance: 'a.logo (href=index.html)', result: logoInfo.status === 200 && !logoInfo.serverError ? 'executed-static' : 'fail', findingIds: logoInfo.status !== 200 || logoInfo.serverError ? ['LG-09'] : [], reason: `GET index.html -> ${logoInfo.status} title=${logoInfo.title} err=${logoInfo.serverError}`, evidence: ['audit/logs/evidence/LG-09-logo-link.json'] });
logCase({ group: GROUP, screen: SCREEN, caseId: 'CC-04', instance: 'footer', result: 'omitted', reason: `Login no renderiza footer (footerPresent=${attrs.footerPresent}); el footer compartido se audita en shared chrome (SH-).` });

// ---------- BT-11 / AX-04: tab order & focus visibility ----------
await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
const tabOrder: any[] = [];
for (let i = 0; i < 9; i++) {
  await page.keyboard.press('Tab');
  tabOrder.push(await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const cs = getComputedStyle(el);
    return { i: 0, id: el.id, tag: el.tagName, text: (el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 30), outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, boxShadow: cs.boxShadow };
  }));
}
tabOrder.forEach((t, i) => (t.i = i + 1));
await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); // back to Entrar roughly
await page.focus('a[onclick="login()"]');
await shot(page, 'login-focus-entrar', false);
saveEvidence('login-tab-order', tabOrder);
console.log('TAB ORDER', JSON.stringify(tabOrder));
{
  const noRing = tabOrder.filter((t) => t.tag === 'A' && t.outlineStyle === 'none' && (t.boxShadow === 'none' || !t.boxShadow));
  const order = tabOrder.map((t) => t.id || t.text).join(' > ');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-11', instance: 'Entrar/Recuperar/Crear Cuenta', result: noRing.length ? 'fail' : 'pass', findingIds: noRing.length ? ['LG-10'] : [], reason: `order: ${order}; links without visible focus ring: ${noRing.map((t) => t.text).join(',') || 'none'}`, evidence: ['audit/logs/evidence/login-tab-order.json', 'audit/screenshots/login-focus-entrar.png'] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'AX-04', instance: 'Login (traversal)', result: noRing.length ? 'fail' : 'pass', findingIds: noRing.length ? ['LG-10'] : [], reason: `order: ${order}` });
}

// ---------- AX-01 / AX-05 axe at 1440 ----------
await page.goto(LOGIN, { waitUntil: 'networkidle' });
const axe = await runAxe(page, 'login-1440');
console.log('AXE', JSON.stringify(axe));
logCase({ group: GROUP, screen: SCREEN, caseId: 'AX-01', instance: 'Login', result: axe.count ? 'fail' : 'pass', findingIds: axe.count ? ['LG-11'] : [], reason: axe.violations.map((v) => `${v.id}(${v.impact},${v.nodes})`).join(', '), evidence: [axe.file] });
{
  const contrast = axe.violations.filter((v) => /contrast/.test(v.id));
  logCase({ group: GROUP, screen: SCREEN, caseId: 'AX-05', instance: 'Login', result: contrast.length ? 'fail' : 'pass', findingIds: contrast.length ? ['LG-11'] : [], reason: contrast.map((v) => `${v.id}: ${v.sample.join(' ; ')}`).join(' | ') || 'no contrast violations from axe', evidence: [axe.file] });
}

// ---------- CC-01 / CC-03 copy ----------
{
  const msgs = Object.values(results).map((r) => ({ label: r.label, message: r.message.slice(0, 200), swal: r.swal.slice(0, 200), status: r.status }));
  const ev = saveEvidence('login-messages', { bodyText: attrs.bodyText, lang: attrs.lang, messages: msgs });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'CC-01', instance: 'Login copy', result: 'fail', findingIds: ['LG-12'], reason: `lang=${attrs.lang}; copy="${attrs.bodyText}" (mezcla inglés/español: Remember me, Password; "Recuperar mi Contraseña?")`, evidence: [ev] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'CC-03', instance: 'Login messages', result: 'executed-static', findingIds: ['LG-04'], reason: `mensajes recogidos: ${JSON.stringify([...new Set(msgs.map((m) => (m.message + ' ' + m.swal).trim()).filter(Boolean))]).slice(0, 400)}`, evidence: [ev] });
}

// ---------- NV-05: unauthenticated direct GETs ----------
{
  const targets = ['MiCuenta.aspx', 'Estado.aspx', 'Rastreo.aspx', 'PruebaExportacion.aspx', 'PreAlerta.aspx', 'PagoOnline.aspx', 'dlg/Adjuntos.aspx'];
  const out: any[] = [];
  const req = await s.browser.newContext();
  for (const t of targets) {
    const r = await req.request.get(`${BASE_URL}/${t}`, { maxRedirects: 0 }).catch((e) => ({ error: String(e) } as any));
    if (r.error) { out.push({ t, error: r.error }); continue; }
    const body = await r.text();
    const leak = /cpBody_|gvDatos|DXR\.axd|class="table|Rastreo|Estado de Cuenta|mm-active/.test(body) && r.status() >= 300;
    const rec = { url: t, status: r.status(), location: r.headers()['location'], bodyLength: body.length, bodyHead: body.slice(0, 300).replace(/\s+/g, ' '), possibleLeak: leak, isLoginPage200: r.status() === 200 && /lUser|Iniciar sesi/.test(body) };
    if (r.status() === 200 && !rec.isLoginPage200) saveText(`nv05-${t.replace(/[\/.]/g, '_')}-200`, body, 'html');
    out.push(rec);
  }
  await req.close();
  const ev = saveEvidence('login-nv05-unauth', out);
  console.log('NV-05', JSON.stringify(out));
  for (const o of out) {
    const ok = (o.status === 302 && /Login\.aspx/i.test(o.location || '') && !o.possibleLeak) || o.isLoginPage200;
    logCase({ group: GROUP, screen: SCREEN, caseId: 'NV-05', instance: o.url, result: ok ? 'pass' : 'fail', findingIds: ok ? [] : ['LG-13'], reason: `status=${o.status} location=${o.location} bodyLen=${o.bodyLength} leak=${o.possibleLeak} loginPage200=${o.isLoginPage200} error=${o.error || ''}`, evidence: [ev] });
  }
  // also a browser navigation to confirm final URL
  await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
  console.log('NV-05 browser final url', page.url());
  saveEvidence('login-nv05-browser-final-url', { finalUrl: page.url() });
}

saveEvidence('login-fields-results', Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { ...v }])));
await s.close();
console.log('DONE login-fields');
