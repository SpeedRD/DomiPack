import { chromium } from 'playwright';
import { login, BASE_URL } from '../support/auth.ts';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page1 = await ctx.newPage();

console.log('--- Log in on page1 ---');
await login(page1);
await page1.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
await page1.waitForTimeout(1000);
console.log('page1 url:', page1.url(), 'loggedIn:', !page1.url().includes('Login.aspx'));

console.log('--- Open a second page (tab) in the SAME context (shares cookies) ---');
const page2 = await ctx.newPage();
await page2.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
await page2.waitForTimeout(1500);
console.log('page2 url:', page2.url(), 'loggedIn:', !page2.url().includes('Login.aspx'));

console.log('--- Re-check page1 after page2 was opened ---');
await page1.reload({ waitUntil: 'domcontentloaded' });
await page1.waitForTimeout(1000);
console.log('page1 url after reload:', page1.url(), 'loggedIn:', !page1.url().includes('Login.aspx'));

const cookies = await ctx.cookies();
console.log('Shared cookies:', cookies.filter(c => c.name.toLowerCase().includes('session')));

await page1.close();
await page2.close();
await ctx.close();
await browser.close();
