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

const s = await startSession({ name: 'p4-nueva-cuenta-dob', auth: false });
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


await s.close();
console.log('DONE dob');
