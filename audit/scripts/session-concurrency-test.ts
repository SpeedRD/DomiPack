import { chromium } from 'playwright';
import { login, BASE_URL } from '../support/auth.ts';

function isLoggedIn(url: string): boolean {
  return !url.includes('Login.aspx');
}

async function checkState(page: any, label: string) {
  await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const url = page.url();
  const title = await page.title();
  const loggedIn = isLoggedIn(url);
  console.log(`[${label}] url=${url} title="${title}" loggedIn=${loggedIn}`);
  return loggedIn;
}

const browser = await chromium.launch();

// Two fully independent browser contexts = independent cookie jars,
// each doing its OWN fresh login() POST (not sharing a cookie).
const ctxA = await browser.newContext();
const ctxB = await browser.newContext();
const pageA = await ctxA.newPage();
const pageB = await ctxB.newPage();

console.log('--- Step 1: log in to context A ---');
await login(pageA);
const cookiesA1 = await ctxA.cookies();
const sessA1 = cookiesA1.find((c) => c.name === 'ASP.NET_SessionId');
console.log('Context A session cookie after login:', sessA1?.value);

console.log('--- Step 2: confirm context A is authenticated ---');
const aAliveBeforeB = await checkState(pageA, 'A-before-B-login');

console.log('--- Step 3: log in to context B (fresh, independent login) ---');
await login(pageB);
const cookiesB1 = await ctxB.cookies();
const sessB1 = cookiesB1.find((c) => c.name === 'ASP.NET_SessionId');
console.log('Context B session cookie after login:', sessB1?.value);

console.log('--- Step 4: immediately re-check context A ---');
const aAliveRightAfterB = await checkState(pageA, 'A-immediately-after-B-login');

console.log('--- Step 5: re-check context B ---');
const bAliveRightAfterB = await checkState(pageB, 'B-immediately-after-B-login');

console.log('--- Step 6: wait 8s, re-check both ---');
await pageA.waitForTimeout(8000);
const aAliveAfterWait = await checkState(pageA, 'A-after-8s-wait');
const bAliveAfterWait = await checkState(pageB, 'B-after-8s-wait');

const cookiesA2 = await ctxA.cookies();
const sessA2 = cookiesA2.find((c) => c.name === 'ASP.NET_SessionId');
console.log('Context A session cookie at end:', sessA2?.value, '(unchanged from initial:', sessA2?.value === sessA1?.value, ')');

console.log('\n=== SUMMARY ===');
console.log('A alive before B logged in:      ', aAliveBeforeB);
console.log('A alive immediately after B login:', aAliveRightAfterB);
console.log('B alive immediately after B login:', bAliveRightAfterB);
console.log('A alive after 8s wait:            ', aAliveAfterWait);
console.log('B alive after 8s wait:            ', bAliveAfterWait);

await pageA.close();
await pageB.close();
await ctxA.close();
await ctxB.close();
await browser.close();
