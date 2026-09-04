// NV-11 re-verification at Phase 4 start: 4 independent contexts (one per planned
// subagent) log in with the same account; all must remain authenticated.
// Also checks that page.evaluate(fn) works under tsx (the __name helper concern).
import { chromium } from 'playwright';
import { login, BASE_URL } from '../../support/auth.ts';

const N = 4;
const browser = await chromium.launch();
const ctxs = [];
const pages = [];
for (let i = 0; i < N; i++) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  ctxs.push(ctx);
  pages.push(page);
  const t0 = Date.now();
  await login(page);
  console.log(`ctx${i} logged in (${Date.now() - t0}ms) url=${page.url()}`);
}

async function alive(page: any) {
  await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  return !page.url().includes('Login.aspx');
}

const r1 = [];
for (let i = 0; i < N; i++) r1.push(await alive(pages[i]));
console.log('alive immediately after all logins:', r1);
await pages[0].waitForTimeout(10000);
const r2 = [];
for (let i = 0; i < N; i++) r2.push(await alive(pages[i]));
console.log('alive after 10s:', r2);

// tsx page.evaluate(fn) probe
try {
  const v = await pages[0].evaluate(() => {
    const el = document.querySelector('#cpBody_gvDatos');
    return { hasGrid: !!el, title: document.title };
  });
  console.log('page.evaluate(fn) OK:', JSON.stringify(v));
} catch (e) {
  console.log('page.evaluate(fn) FAILED:', String(e).slice(0, 200));
}

for (const c of ctxs) await c.close();
await browser.close();
console.log('RESULT', r1.every(Boolean) && r2.every(Boolean) ? 'ALL_ALIVE' : 'SOME_DEAD');
