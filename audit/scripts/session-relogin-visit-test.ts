import { chromium } from 'playwright';
import { login, BASE_URL } from '../support/auth.ts';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

console.log('--- Log in ---');
await login(page);
await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
console.log('after login, Rastreo url:', page.url());

console.log('--- Visit Login.aspx again while authenticated ---');
await page.goto(`${BASE_URL}/Login.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
console.log('Login.aspx visit result url:', page.url());

console.log('--- Now try Rastreo.aspx again ---');
await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
console.log('Rastreo.aspx after Login.aspx visit:', page.url(), 'loggedIn:', !page.url().includes('Login.aspx'));

const cookies = await ctx.cookies();
console.log('Session cookie now:', cookies.find(c => c.name === 'ASP.NET_SessionId')?.value);

await page.close();
await ctx.close();
await browser.close();
