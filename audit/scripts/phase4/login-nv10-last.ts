// Phase 4 — NV-10 [RUN-LAST]: session self-invalidation. Dedicated disposable context.
// Logs in, verifies Rastreo works, navigates to Login.aspx (kills session), then tries Rastreo.aspx -> expect redirect to Login.
import { startSession, shot, logCase, saveEvidence, BASE_URL } from '../../support/phase4.ts';

const s = await startSession({ name: 'p4-login-nv10', auth: true });
const page = s.page;
const step1 = page.url();
await page.goto(`${BASE_URL}/MiCuenta.aspx`, { waitUntil: 'domcontentloaded' });
const step2 = page.url();
const cookiesBefore = (await s.context.cookies()).map((c) => ({ name: c.name, expires: c.expires }));
// LAST ACTION of this context: visit Login.aspx while authenticated
await page.goto(`${BASE_URL}/Login.aspx`, { waitUntil: 'domcontentloaded' });
const step3 = page.url();
const loginBody = await page.evaluate(`(document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 200)`);
await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
const step4 = page.url();
const cookiesAfter = (await s.context.cookies()).map((c) => ({ name: c.name, expires: c.expires }));
await shot(page, 'login-NV-10-after');
const dead = /Login\.aspx/i.test(step4);
const ev = saveEvidence('login-NV-10', { afterLogin: step1, miCuenta: step2, visitLogin: step3, loginBody, rastreoAfter: step4, sessionDead: dead, cookiesBefore, cookiesAfter });
console.log(JSON.stringify({ step1, step2, step3, step4, dead, cookiesBefore, cookiesAfter }));
logCase({ group: 'login', screen: 'Login', caseId: 'NV-10', instance: 'Login.aspx revisit while authenticated', result: dead ? 'fail' : 'pass', findingIds: dead ? ['LG-16'] : [], reason: `after login=${step1}; MiCuenta=${step2}; visit Login -> ${step3} (login form shown, no "already logged in" handling); Rastreo -> ${step4}; sessionDead=${dead}; cookie same name before/after=${JSON.stringify(cookiesBefore.map((c) => c.name))}/${JSON.stringify(cookiesAfter.map((c) => c.name))}`, evidence: [ev, 'audit/screenshots/login-NV-10-after.png'] });
await s.close();
console.log('DONE nv10');
