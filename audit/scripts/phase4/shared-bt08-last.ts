// Phase 4 / micuenta — NV-12 (bounded idle observation) then BT-08 `Salir` as the LAST action of this context.
import { startSession, go, shot, saveEvidence, visibleText, BASE_URL } from '../../support/phase4.ts';
import { log, NAME_SHIM, openTab, assertNotLogin } from './_micuenta-common.ts';

const IDLE_MS = Number(process.env.IDLE_MS || 9 * 60 * 1000);
const s = await startSession({ name: 'p4-shared-bt08' });
const page = s.page;
await s.context.addInitScript(NAME_SHIM);
await go(page, 'MiCuenta.aspx');
assertNotLogin(page, 'start');
const cookiesBefore = await s.context.cookies();
console.log('cookies at start', cookiesBefore.map((c) => `${c.name} exp=${c.expires} httpOnly=${c.httpOnly} secure=${c.secure} sameSite=${c.sameSite}`));

// ---- NV-12: idle then act ----
const t0 = Date.now();
console.log(`idling ${IDLE_MS / 1000}s ...`);
await page.waitForTimeout(IDLE_MS);
const idleMin = Math.round((Date.now() - t0) / 6000) / 10;
let nv12Result: 'pass' | 'fail' = 'pass';
let nv12Note = '';
try {
  await openTab(page, 'dependientes'); // client-side action after idle
  const beforeUrl = page.url();
  await page.reload({ waitUntil: 'domcontentloaded' }); // server round-trip after idle
  await page.waitForTimeout(800);
  const alive = !/Login\.aspx/i.test(page.url());
  const text = (await visibleText(page)).slice(0, 200);
  nv12Note = `idle ${idleMin} min; tab switch OK; reload -> ${page.url()} alive=${alive}; text="${text.slice(0, 80)}"`;
  if (!alive) {
    nv12Result = 'fail';
    nv12Note += ' (session expired within idle window; check whether any message explains the re-login)';
  }
  await shot(page, 'nv12-after-idle');
  console.log(beforeUrl, nv12Note);
} catch (e) {
  nv12Result = 'fail';
  nv12Note = `error after idle: ${(e as Error).message}`;
}
log('Shared chrome', 'NV-12', 'session idle (MiCuenta)', nv12Result, nv12Note, undefined, ['audit/screenshots/nv12-after-idle.png']);

// ---- BT-08: Salir (LAST) ----
if (!/Login\.aspx/i.test(page.url())) {
  await page.click('a.p-0.btn[data-toggle="dropdown"]');
  await page.waitForTimeout(400);
  const salir = page.locator('button.dropdown-item:has-text("Salir")');
  const salirInfo = await salir.evaluate((b) => ({ onclick: b.getAttribute('onclick'), visible: b.getBoundingClientRect().width > 0, type: b.getAttribute('type') }));
  console.log('salir', salirInfo);
  const reqs: string[] = [];
  page.on('request', (r) => reqs.push(`${r.method()} ${r.url()}`));
  const resps: { url: string; status: number; setCookie: string | null }[] = [];
  page.on('response', (r) => resps.push({ url: r.url(), status: r.status(), setCookie: r.headers()['set-cookie'] || null }));
  await salir.click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  const afterSalirUrl = page.url();
  console.log('after Salir', afterSalirUrl);
  await shot(page, 'bt08-after-salir', false);
  const cookiesAfter = await s.context.cookies();
  // Verify session end: try a protected page.
  await page.goto(`${BASE_URL}/MiCuenta.aspx`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const afterProtected = page.url();
  console.log('protected after logout ->', afterProtected);
  const ev = saveEvidence('SH-BT08-logout', { salirInfo, afterSalirUrl, afterProtected, requests: reqs.filter((r) => !/\.(png|css|js|woff|axd|svg|jpg)/i.test(r)), responses: resps.filter((r) => !/\.(png|css|js|woff|svg|jpg)/i.test(r.url)), cookiesBefore: cookiesBefore.map((c) => ({ name: c.name, expires: c.expires })), cookiesAfter: cookiesAfter.map((c) => ({ name: c.name, expires: c.expires, value: c.value.slice(0, 6) + '…' })) });
  const ok = /Login\.aspx/i.test(afterSalirUrl) && /Login\.aspx/i.test(afterProtected);
  log('Shared chrome', 'BT-08', 'Salir (user dropdown)', ok ? 'pass' : 'fail', `Salir -> ${afterSalirUrl}; MiCuenta.aspx after logout -> ${afterProtected}; cookies before=${cookiesBefore.length} after=${cookiesAfter.length}`, undefined, ['audit/screenshots/bt08-after-salir.png', ev]);
} else {
  log('Shared chrome', 'BT-08', 'Salir (user dropdown)', 'omitted', 'session already on Login.aspx after the NV-12 idle window; Salir could not be exercised in this context');
}
await s.close();
