import { chromium } from 'playwright';
import { login, BASE_URL } from '../support/auth.ts';

async function checkState(page: any, label: string) {
  await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const loggedIn = !page.url().includes('Login.aspx');
  console.log(`[${label}] loggedIn=${loggedIn}`);
  return loggedIn;
}

const browser = await chromium.launch();
const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
const pages = await Promise.all(contexts.map((c) => c.newPage()));

console.log('--- Logging in to 3 independent contexts SEQUENTIALLY ---');
for (let i = 0; i < 3; i++) {
  await login(pages[i]);
  console.log(`context ${i} logged in`);
}

console.log('--- Checking all 3 after all logins ---');
for (let i = 0; i < 3; i++) {
  await checkState(pages[i], `ctx${i}-after-all-logins`);
}

console.log('--- Wait 10s, check again ---');
await pages[0].waitForTimeout(10000);
for (let i = 0; i < 3; i++) {
  await checkState(pages[i], `ctx${i}-after-wait`);
}

await Promise.all(contexts.map((c) => c.close()));
await browser.close();
