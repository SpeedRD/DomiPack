// Phase 4 — Login.aspx real-login cases, each in its own throwaway context:
//  A) BT-07/NV-08: single click with correct creds -> measure loading window, capture POST response headers/body (redacted), landing URL.
//  B) BT-01: double-click Entrar with correct creds -> count login POSTs; final state.
//  C) BT-04: click Entrar, then during the loading window navigate away (NuevaCuenta.aspx) -> then Rastreo.aspx: authenticated?
//  D) BT-04b: click Entrar, click again after 1s during loading -> state.
// Never navigates an authenticated context to Login.aspx / '/'.
import { Page, BrowserContext } from 'playwright';
import { startSession, shot, logCase, saveEvidence, saveText, BASE_URL, attachErrorBodyCapture } from '../../support/phase4.ts';
import { attachCapture } from '../../support/capture.ts';

const GROUP = 'login';
const SCREEN = 'Login';
const LOGIN = `${BASE_URL}/Login.aspx`;
const USER = process.env.DP_USERNAME || 'DP-014003';
const PASS = process.env.DP_PASSWORD || '';
if (!PASS) throw new Error('DP_PASSWORD missing');

const s = await startSession({ name: 'p4-login-loading', auth: false });

async function ctx(sub: string): Promise<{ c: BrowserContext; p: Page; posts: { ts: number; url: string }[]; responses: any[] }> {
  const c = await s.browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-DO' });
  const p = await c.newPage();
  attachCapture(p, `p4-login-loading-${sub}`);
  attachErrorBodyCapture(p, `p4-login-loading-${sub}`);
  const posts: { ts: number; url: string }[] = [];
  const responses: any[] = [];
  p.on('request', (r) => { if (r.method() === 'POST' && /Login\.aspx/i.test(r.url())) posts.push({ ts: Date.now(), url: r.url() }); });
  p.on('response', async (r) => {
    if (r.request().method() === 'POST' && /Login\.aspx/i.test(r.url())) {
      let body = '';
      try { body = await r.text(); } catch { /* redirect bodies may be unavailable */ }
      responses.push({ ts: Date.now(), status: r.status(), headers: r.headers(), bodyLen: body.length, bodyHead: body.slice(0, 1500) });
    }
  });
  return { c, p, posts, responses };
}
async function fill(p: Page) {
  await p.goto(LOGIN, { waitUntil: 'domcontentloaded' });
  await p.fill('#lUser', USER);
  await p.fill('#lPass', PASS);
}
async function sampleLoading(p: Page, ms: number, every = 500) {
  const samples: any[] = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const st = await p.evaluate(`(() => { var a = document.querySelector('a[onclick="login()"]'); return { title: document.title, url: location.href, hasEntrar: !!a, entrarCls: a ? a.className : null, blockUI: !!document.querySelector('.blockUI'), preloader: !!document.querySelector('.se-pre-con'), swal: !!document.querySelector('.swal2-container'), spinner: !!document.querySelector('.spinner, .loading, .loader, [class*="spinner"]'), readyState: document.readyState }; })()`).catch((e) => ({ err: String(e).slice(0, 80) }));
    samples.push({ t: Date.now() - t0, ...st });
    if (!/Login\.aspx/i.test(p.url())) break;
    await p.waitForTimeout(every);
  }
  return samples;
}

// ---------- A: single click, measure loading window & feedback ----------
{
  const { c, p, posts, responses } = await ctx('single');
  await fill(p);
  const t0 = Date.now();
  await p.click('a[onclick="login()"]');
  const samples = await sampleLoading(p, 40000);
  await p.waitForURL((u) => !/Login\.aspx/i.test(u.href), { timeout: 40000 }).catch(() => {});
  await p.waitForLoadState('domcontentloaded').catch(() => {});
  const landed = p.url();
  const total = Date.now() - t0;
  const ev = saveEvidence('LG-08-loading-samples', { totalMs: total, landed, posts: posts.map((x) => ({ dt: x.ts - t0 })), responses: responses.map((r) => ({ dt: r.ts - t0, status: r.status, location: r.headers['location'], contentType: r.headers['content-type'], bodyLen: r.bodyLen, bodyHead: r.bodyHead.replace(/\s+/g, ' ').slice(0, 600) })), samples });
  console.log('A', JSON.stringify({ total, landed, posts: posts.length, responses: responses.map((r) => ({ status: r.status, location: r.headers['location'], bodyLen: r.bodyLen })), samples: samples.slice(0, 6) }));
  const feedback = samples.some((x) => x.blockUI || x.preloader || x.spinner || (x.entrarCls && /disabled/.test(x.entrarCls)));
  logCase({ group: GROUP, screen: SCREEN, caseId: 'NV-08', instance: 'post-login landing', result: /Rastreo\.aspx/i.test(landed) ? 'pass' : 'fail', reason: `landed=${landed} totalMs=${total} posts=${posts.length} respStatus=${responses.map((r) => r.status).join(',')}`, evidence: [ev] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-07', instance: 'Entrar (login correcto)', result: feedback ? 'pass' : 'fail', findingIds: feedback ? [] : ['LG-08'], reason: `loadingWindowMs=${total} visibleFeedback=${feedback} titles=${JSON.stringify([...new Set(samples.map((x) => x.title))])}`, evidence: [ev] });
  await shot(p, 'login-landing-after-login');
  await p.close(); await c.close();
}

// ---------- B: double-click Entrar ----------
{
  const { c, p, posts, responses } = await ctx('dblclick');
  await fill(p);
  const t0 = Date.now();
  await p.dblclick('a[onclick="login()"]');
  await p.waitForTimeout(1500);
  // also a rapid third click if still on login
  if (/Login\.aspx/i.test(p.url())) await p.click('a[onclick="login()"]').catch(() => {});
  await p.waitForURL((u) => !/Login\.aspx/i.test(u.href), { timeout: 45000 }).catch(() => {});
  await p.waitForLoadState('domcontentloaded').catch(() => {});
  await p.waitForTimeout(1000);
  const landed = p.url();
  const ev = saveEvidence('LG-15-dblclick', { totalMs: Date.now() - t0, landed, posts: posts.map((x) => ({ dt: x.ts - t0 })), responses: responses.map((r) => ({ dt: r.ts - t0, status: r.status, location: r.headers['location'], bodyLen: r.bodyLen })) });
  console.log('B', JSON.stringify({ landed, posts: posts.length, responses: responses.map((r) => r.status) }));
  await shot(p, 'LG-15');
  // verify session works
  await p.goto(`${BASE_URL}/MiCuenta.aspx`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  const stillAuth = !/Login\.aspx/i.test(p.url());
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-01', instance: 'Entrar (doble clic)', result: posts.length > 1 ? 'fail' : 'pass', findingIds: posts.length > 1 ? ['LG-15'] : [], reason: `loginPOSTs=${posts.length} landed=${landed} stillAuthAfter=${stillAuth} statuses=${responses.map((r) => r.status).join(',')}`, evidence: ['audit/screenshots/LG-15.png', ev] });
  await p.close(); await c.close();
}

// ---------- C: navigate away during loading ----------
{
  const { c, p, posts, responses } = await ctx('interrupt-nav');
  await fill(p);
  const t0 = Date.now();
  await p.click('a[onclick="login()"]');
  await p.waitForTimeout(1500);
  const stillLoading = /Login\.aspx/i.test(p.url());
  await p.goto(`${BASE_URL}/NuevaCuenta.aspx`, { waitUntil: 'domcontentloaded' }).catch((e) => console.log('nav err', String(e).slice(0, 100)));
  await p.waitForTimeout(1500);
  const afterNav = p.url();
  await p.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(1500);
  const finalUrl = p.url();
  const authed = !/Login\.aspx/i.test(finalUrl);
  const ev = saveEvidence('login-BT-04-interrupt-nav', { stillLoadingAt1500ms: stillLoading, afterNav, finalUrl, authed, posts: posts.map((x) => ({ dt: x.ts - t0 })), responses: responses.map((r) => ({ dt: r.ts - t0, status: r.status })) });
  console.log('C', JSON.stringify({ stillLoading, afterNav, finalUrl, authed, posts: posts.length }));
  await shot(p, 'login-BT-04-interrupt-nav');
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-04', instance: 'Entrar → navegar a NuevaCuenta.aspx durante la carga', result: 'executed-static', reason: `stillLoadingAt1.5s=${stillLoading} afterNav=${afterNav} then Rastreo -> ${finalUrl} authenticated=${authed} posts=${posts.length}`, evidence: [ev, 'audit/screenshots/login-BT-04-interrupt-nav.png'] });
  logCase({ group: GROUP, screen: SCREEN, caseId: 'NV-08', instance: 'landing interrumpido (navegación)', result: authed || !stillLoading ? 'pass' : 'fail', reason: `authenticated after interruption=${authed}` });
  await p.close(); await c.close();
}

// ---------- D: second click during loading ----------
{
  const { c, p, posts, responses } = await ctx('interrupt-click');
  await fill(p);
  const t0 = Date.now();
  await p.click('a[onclick="login()"]');
  await p.waitForTimeout(1000);
  const stillLoading = /Login\.aspx/i.test(p.url());
  if (stillLoading) await p.click('a[onclick="login()"]', { timeout: 3000 }).catch((e) => console.log('2nd click err', String(e).slice(0, 80)));
  await p.waitForURL((u) => !/Login\.aspx/i.test(u.href), { timeout: 45000 }).catch(() => {});
  await p.waitForLoadState('domcontentloaded').catch(() => {});
  await p.waitForTimeout(1000);
  const landed = p.url();
  const ev = saveEvidence('login-BT-04-second-click', { stillLoadingAt1s: stillLoading, landed, posts: posts.map((x) => ({ dt: x.ts - t0 })), responses: responses.map((r) => ({ dt: r.ts - t0, status: r.status })) });
  console.log('D', JSON.stringify({ stillLoading, landed, posts: posts.length }));
  logCase({ group: GROUP, screen: SCREEN, caseId: 'BT-04', instance: 'Entrar → segundo clic durante la carga', result: posts.length > 1 ? 'fail' : 'pass', findingIds: posts.length > 1 ? ['LG-15'] : [], reason: `stillLoadingAt1s=${stillLoading} loginPOSTs=${posts.length} landed=${landed}`, evidence: [ev] });
  await p.close(); await c.close();
}

await s.close();
console.log('DONE login-loading');
