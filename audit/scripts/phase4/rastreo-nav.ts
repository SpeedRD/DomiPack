// Rastreo navigation: NV-01/NV-02 (Back/Forward after Historial filter and after VerGuia postback),
// href="#" history pollution, sitemap-addition confirming GET (WebService1.asmx referenced by inline JS).
import { startSession, go, shot, saveEvidence, saveText, logCase, serverErrorSignature, BASE_URL, onLogin } from '../../support/phase4.ts';

const G = 'rastreo';
const SC = 'Rastreo (navigation)';
const s = await startSession({ name: 'p4-rastreo-nav' });
const page = s.page;
await s.context.addInitScript('window.__name = window.__name || (function(f){return f;});');
await page.evaluate('window.__name = window.__name || (function(f){return f;});');
if (!/Rastreo\.aspx/i.test(page.url())) await go(page, 'Rastreo.aspx');
await page.waitForLoadState('networkidle').catch(() => {});
const dialogs: string[] = [];
page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()}`); await d.dismiss().catch(() => {}); });
const posts: string[] = [];
page.on('request', (r) => { if (r.method() === 'POST') posts.push(`${new Date().toISOString()} ${r.url()}`); });

const state = () => page.evaluate(() => ({
  url: location.href, hist: history.length,
  rows: Array.from(document.querySelectorAll('#cpBody_gvDatos tr[id*="DXDataRow"], #cpBody_gvDatos tr[id*="DXGroupRow"], #cpBody_gvDatos tr[id*="DXEmptyRow"]')).map((r) => (r as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 60)),
  modal: !!document.querySelector('#modal_Historial.show'),
  popup: (() => { const w = document.getElementById('cpBody_ppCambioGuia_PW-1'); return !!w && getComputedStyle(w).display !== 'none'; })(),
  desde: (document.getElementById('cpBody_lDesde') as HTMLInputElement | null)?.value, hasta: (document.getElementById('cpBody_lHasta') as HTMLInputElement | null)?.value,
  bodyHead: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120),
})).catch((e) => ({ error: e.message.split('\n')[0], url: page.url() } as any));

const nv: any = {};
try {
  nv.s0 = await state();
  // open Historial, filter a wide range (results replace grid)
  await page.click('#cpBody_bpagar'); await page.waitForTimeout(300);
  await page.click('a[data-target="#modal_Historial"]'); await page.waitForSelector('#modal_Historial.show'); await page.waitForTimeout(300);
  nv.s1_modalOpen = await state();
  await page.evaluate(() => { (document.getElementById('cpBody_lDesde') as HTMLInputElement).value = '2025-01-01'; (document.getElementById('cpBody_lHasta') as HTMLInputElement).value = '2026-12-31'; });
  const nav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
  await page.click('#modal_Historial a[onclick="Filtro()"]'); await nav; await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800);
  nv.s2_afterFilter = await state();
  // NV-01: Back
  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => { nv.backErr = e.message.split('\n')[0]; });
  await page.waitForTimeout(1500);
  nv.s3_afterBack = await state();
  nv.s3_serverErr = serverErrorSignature(await page.content().catch(() => ''));
  nv.s3_shot = await shot(page, 'rastreo-nav-after-back', false);
  // NV-02: Forward (POST result → resubmission?)
  const nPosts = posts.length;
  await page.goForward({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => { nv.fwdErr = e.message.split('\n')[0]; });
  await page.waitForTimeout(2500);
  nv.s4_afterForward = await state();
  nv.s4_postsFired = posts.slice(nPosts);
  nv.s4_serverErr = serverErrorSignature(await page.content().catch(() => ''));
  nv.s4_dialogs = dialogs.splice(0);
  nv.s4_shot = await shot(page, 'rastreo-nav-after-forward', false);
  nv.s4_onLogin = onLogin(page);
  // reload after forward (F5 on a POST result → browser resubmission prompt in a real browser)
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => { nv.reloadErr = e.message.split('\n')[0]; });
  await page.waitForTimeout(1500);
  nv.s5_afterReload = await state();
  nv.s5_postsFired = posts.slice(nPosts + nv.s4_postsFired.length);
  nv.s5_onLogin = onLogin(page);
} catch (e: any) { nv.error = e.message.split('\n')[0]; }
console.log('NV-01/02 historial', JSON.stringify(nv, null, 1));
saveEvidence('rastreo-NV-01-02-historial', nv);
const backOk = nv.s3_afterBack && !nv.s3_afterBack.error && !nv.s3_serverErr && !nv.backErr;
logCase({ group: G, screen: SC, caseId: 'NV-01', instance: 'Historial filter → Back', result: backOk ? 'pass' : 'fail', reason: `after back: url=${nv.s3_afterBack?.url} rows=${nv.s3_afterBack?.rows?.length} modal=${nv.s3_afterBack?.modal} err=${nv.backErr || nv.s3_serverErr || nv.s3_afterBack?.error}; hist before filter=${nv.s1_modalOpen?.hist} after=${nv.s2_afterFilter?.hist}`, evidence: ['audit/logs/evidence/rastreo-NV-01-02-historial.json', 'audit/screenshots/rastreo-nav-after-back.png'] });
const fwdOk = nv.s4_afterForward && !nv.s4_afterForward.error && !nv.s4_serverErr && !nv.fwdErr && !nv.s4_onLogin;
logCase({ group: G, screen: SC, caseId: 'NV-02', instance: 'Historial filter → Back → Forward (+reload)', result: fwdOk ? 'pass' : 'fail', findingIds: fwdOk ? [] : ['RA-16'], reason: `forward: url=${nv.s4_afterForward?.url} rows=${nv.s4_afterForward?.rows?.length} posts=${nv.s4_postsFired?.length} err=${nv.fwdErr || nv.s4_serverErr || nv.s4_afterForward?.error} onLogin=${nv.s4_onLogin} body="${nv.s4_afterForward?.bodyHead}"; reload: rows=${nv.s5_afterReload?.rows?.length} posts=${nv.s5_postsFired?.length} err=${nv.reloadErr} onLogin=${nv.s5_onLogin}`, evidence: ['audit/logs/evidence/rastreo-NV-01-02-historial.json', 'audit/screenshots/rastreo-nav-after-forward.png'] });

// ---- NV-01/02 after VerGuia (Movimientos) postback
const nvm: any = {};
try {
  if (!/Rastreo\.aspx/i.test(page.url()) || !(await page.locator('a[onclick*="VerGuia"]').count())) { await go(page, 'Rastreo.aspx'); await page.waitForLoadState('networkidle').catch(() => {}); }
  nvm.s0 = await state();
  const nav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
  await page.click('a[onclick*="VerGuia"]'); await nav; await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800);
  nvm.s1_popup = await state();
  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => { nvm.backErr = e.message.split('\n')[0]; });
  await page.waitForTimeout(1500);
  nvm.s2_back = await state();
  nvm.s2_err = serverErrorSignature(await page.content().catch(() => ''));
  const nPosts = posts.length;
  await page.goForward({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => { nvm.fwdErr = e.message.split('\n')[0]; });
  await page.waitForTimeout(2500);
  nvm.s3_fwd = await state();
  nvm.s3_posts = posts.slice(nPosts);
  nvm.s3_err = serverErrorSignature(await page.content().catch(() => ''));
  nvm.s3_onLogin = onLogin(page);
  nvm.dialogs = dialogs.splice(0);
} catch (e: any) { nvm.error = e.message.split('\n')[0]; }
console.log('NV-01/02 movimientos', JSON.stringify(nvm, null, 1));
saveEvidence('rastreo-NV-01-02-movimientos', nvm);
logCase({ group: G, screen: SC, caseId: 'NV-01', instance: 'VerGuia (Movimientos) → Back', result: nvm.s2_back && !nvm.s2_err && !nvm.backErr && !nvm.s2_back.error ? 'pass' : 'fail', reason: `back: url=${nvm.s2_back?.url} rows=${nvm.s2_back?.rows?.length} popup=${nvm.s2_back?.popup} err=${nvm.backErr || nvm.s2_err}`, evidence: ['audit/logs/evidence/rastreo-NV-01-02-movimientos.json'] });
logCase({ group: G, screen: SC, caseId: 'NV-02', instance: 'VerGuia → Back → Forward', result: nvm.s3_fwd && !nvm.s3_err && !nvm.fwdErr && !nvm.s3_fwd.error && !nvm.s3_onLogin ? 'pass' : 'fail', findingIds: nvm.s3_fwd && !nvm.s3_err && !nvm.fwdErr && !nvm.s3_fwd.error && !nvm.s3_onLogin ? [] : ['RA-16'], reason: `forward: url=${nvm.s3_fwd?.url} rows=${nvm.s3_fwd?.rows?.length} popup=${nvm.s3_fwd?.popup} posts=${nvm.s3_posts?.length} err=${nvm.fwdErr || nvm.s3_err || nvm.s3_fwd?.error} onLogin=${nvm.s3_onLogin} body="${nvm.s3_fwd?.bodyHead}"`, evidence: ['audit/logs/evidence/rastreo-NV-01-02-movimientos.json'] });

// ---- NV-06: omitted (owned by docs group)
logCase({ group: G, screen: SC, caseId: 'NV-06', instance: 'PagoOnline.aspx reachability', result: 'omitted', reason: 'PagoOnline reachability is covered by the docs group (PO- prefix); not exercised here' });
logCase({ group: G, screen: SC, caseId: 'NV-10', instance: 'session self-invalidation', result: 'omitted', reason: 'owned by micuenta/login group' });
logCase({ group: G, screen: SC, caseId: 'BT-08', instance: 'Salir', result: 'omitted', reason: 'owned by micuenta/login group' });

// ---- Sitemap additions: WebService1.asmx referenced by inline JS (GetPaquetesCan / GetEstatus) — single confirming GET
const ws: any = {};
try {
  const r = await s.context.request.get(`${BASE_URL}/WebService1.asmx`, { maxRedirects: 0, timeout: 20000 });
  const body = await r.text();
  ws.status = r.status(); ws.size = body.length; ws.location = r.headers()['location']; ws.contentType = r.headers()['content-type'];
  ws.titleMatch = body.match(/<title>([^<]*)<\/title>/i)?.[1];
  ws.methods = Array.from(body.matchAll(/<a href="WebService1\.asmx\?op=([^"]+)"/g)).map((m) => m[1]);
  ws.sig = serverErrorSignature(body);
  ws.ev = saveText('rastreo-sitemap-WebService1', `<!-- GET ${BASE_URL}/WebService1.asmx -> ${r.status()} -->\n` + body, 'html');
} catch (e: any) { ws.error = e.message.split('\n')[0]; }
console.log('WebService1.asmx', JSON.stringify(ws));
saveEvidence('rastreo-sitemap-additions', { WebService1: ws, evidenceSource: 'Rastreo.aspx inline script: $.ajax url "WebService1.asmx/GetPaquetesCan" and "WebService1.asmx/GetEstatus" (functions GetPaquetesCan/GetEstatus, not wired to any UI control found)' });

// ---- mixed-content: does anything on Rastreo use google maps? (impact check for the blocked http script)
const maps = await page.evaluate(() => ({ googleDefined: typeof (window as any).google, mapsUsed: !!document.querySelector('[id*="map"], .map, #map'), scriptTag: Array.from(document.scripts).map((x) => x.src).filter((x) => /maps\.google/.test(x)) })).catch((e) => ({ error: e.message }));
console.log('maps', JSON.stringify(maps));
saveEvidence('rastreo-mixed-content-maps', maps);

console.log('posts', posts);
await s.close();
console.log('done');
