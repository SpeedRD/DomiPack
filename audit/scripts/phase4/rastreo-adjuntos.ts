// Rastreo > Adjuntos popup (dlg/Adjuntos.aspx, target=_blank): MD-09, NV-07, TB-01, TB-08, AX-01 (popup), BT-06 (upload control?).
// Read-only GETs only. NEVER upload anything.
import { startSession, go, shot, saveEvidence, saveText, logCase, serverErrorSignature, runAxe, BASE_URL } from '../../support/phase4.ts';

const G = 'rastreo';
const SC = 'Rastreo > Adjuntos (dlg/Adjuntos.aspx popup)';
const s = await startSession({ name: 'p4-rastreo-adjuntos' });
const page = s.page;
await s.context.addInitScript('window.__name = window.__name || (function(f){return f;});');
await page.evaluate('window.__name = window.__name || (function(f){return f;});');
if (!/Rastreo\.aspx/i.test(page.url())) await go(page, 'Rastreo.aspx');
await page.waitForLoadState('networkidle').catch(() => {});

const link = await page.evaluate(() => { const a = document.querySelector('a[href*="Adjuntos.aspx"]') as HTMLAnchorElement | null; return a ? { href: a.getAttribute('href'), abs: a.href, target: a.target, onclick: a.getAttribute('onclick'), rel: a.getAttribute('rel'), text: a.innerText.trim(), title: a.title, ariaLabel: a.getAttribute('aria-label') } : null; });
console.log('link', JSON.stringify(link));

// ---- MD-09: open via click (target=_blank → new tab)
const md09: any = { link };
try {
  const popupP = page.waitForEvent('popup', { timeout: 15000 });
  await page.click('a[href*="Adjuntos.aspx"]');
  const popup = await popupP;
  await popup.waitForLoadState('domcontentloaded');
  await popup.waitForLoadState('networkidle').catch(() => {});
  await popup.waitForTimeout(800);
  md09.url = popup.url();
  md09.title = await popup.title();
  const html = await popup.content();
  md09.serverErr = serverErrorSignature(html);
  saveText('rastreo-adjuntos-page', html, 'html');
  md09.info = await popup.evaluate(() => ({
    vw: innerWidth, vh: innerHeight, outerW: outerWidth, outerH: outerHeight,
    bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 800),
    hasFileInput: document.querySelectorAll('input[type=file]').length,
    buttons: Array.from(document.querySelectorAll('input[type=submit],input[type=button],button,a[onclick]')).map((b) => ({ tag: b.tagName, id: b.id, text: (b as HTMLElement).innerText?.trim() || (b as HTMLInputElement).value, onclick: b.getAttribute('onclick'), visible: (b as HTMLElement).offsetParent !== null })),
    gridEmpty: (document.querySelector('#gvDatos_DXEmptyRow') as HTMLElement | null)?.innerText.trim(),
    th: document.querySelectorAll('#gvDatos th').length, tdHeaders: document.querySelectorAll('#gvDatos td.dxgvHeader_Office365').length,
    hasChrome: !!document.querySelector('.app-header, .app-sidebar'), closeControl: Array.from(document.querySelectorAll('a,button')).filter((e) => /cerrar|close|volver/i.test((e as HTMLElement).innerText || '')).map((e) => (e as HTMLElement).innerText.trim()),
    lang: document.documentElement.lang, titleTag: document.title, scripts: Array.from(document.scripts).map((s) => s.src).filter(Boolean).slice(0, 10), loadingText: Array.from(document.querySelectorAll('*')).filter((e) => e.children.length === 0 && /Loading/.test(e.textContent || '')).map((e) => e.textContent?.trim()).slice(0, 3),
  }));
  md09.shot = await shot(popup, 'rastreo-adjuntos-popup');
  md09.axe = await runAxe(popup, 'rastreo-adjuntos');
  // no-JS / blocked popup: the link is a plain target=_blank anchor with a real href, so blockers would still allow it as a user-initiated click. Record only.
  await popup.close();
} catch (e: any) { md09.error = e.message.split('\n')[0]; }
console.log('MD-09', JSON.stringify(md09, null, 1));
saveEvidence('rastreo-MD-09-adjuntos', md09);
logCase({ group: G, screen: SC, caseId: 'MD-09', instance: 'Adjuntos "0" link (target=_blank)', result: md09.error || md09.serverErr ? 'fail' : 'pass', reason: `opened as new tab url=${md09.url} title="${md09.title}" fileInputs=${md09.info?.hasFileInput} empty="${md09.info?.gridEmpty}" chrome=${md09.info?.hasChrome} closeControl=${JSON.stringify(md09.info?.closeControl)} err=${md09.error || md09.serverErr}`, evidence: ['audit/screenshots/rastreo-adjuntos-popup.png', 'audit/logs/evidence/rastreo-MD-09-adjuntos.json', 'audit/logs/evidence/rastreo-adjuntos-page.html'] });
logCase({ group: G, screen: SC, caseId: 'TB-01', instance: '#gvDatos (Adjuntos, empty)', result: md09.info ? 'executed-static' : 'omitted', findingIds: md09.info && /No data to display/.test(md09.info.gridEmpty || '') ? ['RA-14'] : [], reason: `empty-state text="${md09.info?.gridEmpty}" (DevExpress default, English); page text: ${md09.info?.bodyText?.slice(0, 200)}`, evidence: ['audit/screenshots/rastreo-adjuntos-popup.png'] });
logCase({ group: G, screen: SC, caseId: 'TB-08', instance: '#gvDatos (Adjuntos)', result: md09.info ? (md09.info.th === 0 ? 'fail' : 'pass') : 'omitted', findingIds: md09.info?.th === 0 ? ['RA-06'] : [], reason: `th=${md09.info?.th} td.dxgvHeader=${md09.info?.tdHeaders}`, evidence: ['audit/logs/evidence/rastreo-adjuntos-page.html'] });
logCase({ group: G, screen: SC, caseId: 'AX-01', instance: 'dlg/Adjuntos.aspx', result: md09.axe ? 'executed-static' : 'omitted', reason: md09.axe ? `${md09.axe.count} violation types: ${md09.axe.violations.map((v: any) => `${v.id}(${v.impact},${v.nodes})`).join(', ')}` : 'popup failed', evidence: md09.axe ? [md09.axe.file] : [] });
logCase({ group: G, screen: SC, caseId: 'BT-06', instance: 'Adjuntos upload/attach control', result: 'omitted', reason: `no upload control present in the DOM (file inputs=${md09.info?.hasFileInput}); nothing to inspect; per hard rules no upload attempted`, evidence: ['audit/logs/evidence/rastreo-MD-09-adjuntos.json'] });

// ---- NV-07: direct GETs with missing/garbage params (read-only, existing route only)
const base = `${BASE_URL}/dlg/Adjuntos.aspx`;
const variants: [string, string][] = [
  ['baseline', `${base}?o=Rastreo.aspx&cl=DP01-00306834&c=01`],
  ['missing-cl', `${base}?o=Rastreo.aspx&c=01`],
  ['missing-c', `${base}?o=Rastreo.aspx&cl=DP01-00306834`],
  ['missing-o', `${base}?cl=DP01-00306834&c=01`],
  ['no-params', `${base}`],
  ['garbage', `${base}?o=Rastreo.aspx&cl=zzz&c=zzz`],
  ['empty-values', `${base}?o=Rastreo.aspx&cl=&c=`],
  ['other-guia', `${base}?o=Rastreo.aspx&cl=DP01-00000001&c=01`],
  ['specials', `${base}?o=Rastreo.aspx&cl=%3Cscript%3Ealert(1)%3C%2Fscript%3E&c=%27`],
];
const nv07: any[] = [];
for (const [label, url] of variants) {
  const t0 = Date.now();
  const r = await s.context.request.get(url, { maxRedirects: 0, timeout: 30000 }).catch((e) => ({ err: e.message } as any));
  if (r.err) { nv07.push({ label, url, err: r.err }); continue; }
  const body = await r.text();
  const sig = serverErrorSignature(body);
  const ev = saveText(`rastreo-NV-07-${label}`, `<!-- GET ${url} -> ${r.status()} ${Date.now() - t0}ms -->\n` + body, 'html');
  const textOnly = body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  nv07.push({ label, url, status: r.status(), ms: Date.now() - t0, size: body.length, location: r.headers()['location'], sig, empty: /No data to display/.test(body), hasGrid: /gvDatos/.test(body), reflected: /<script>alert\(1\)<\/script>/.test(body), text: textOnly.slice(0, 200), ev });
  console.log(`[NV-07 ${label}] ${r.status()} ${Date.now() - t0}ms size=${body.length} sig=${sig} empty=${/No data to display/.test(body)} loc=${r.headers()['location'] || ''}`);
}
saveEvidence('rastreo-NV-07-adjuntos-params', nv07);
const nv07Errors = nv07.filter((v) => v.sig || (v.status && v.status >= 500));
logCase({ group: G, screen: SC, caseId: 'NV-07', instance: 'dlg/Adjuntos.aspx param variants (9 GETs)', result: nv07Errors.length ? 'fail' : 'pass', findingIds: nv07Errors.length ? ['RA-15'] : [], reason: nv07.map((v) => `${v.label}:${v.status ?? v.err}${v.sig ? '(' + v.sig + ')' : ''}`).join(' '), evidence: ['audit/logs/evidence/rastreo-NV-07-adjuntos-params.json', ...nv07.map((v) => v.ev).filter(Boolean)] });
// visual check of the worst variant in a real tab (screenshot)
const worst = nv07Errors[0] || nv07.find((v) => v.label === 'garbage');
if (worst) {
  const p2 = await s.newPage('nv07');
  await p2.goto(worst.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p2.waitForTimeout(800);
  await shot(p2, nv07Errors.length ? 'RA-15' : 'rastreo-adjuntos-garbage');
  await p2.close();
}

await s.close();
console.log('done');
