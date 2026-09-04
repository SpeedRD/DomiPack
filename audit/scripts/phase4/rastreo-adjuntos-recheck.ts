// NV-07 recheck: same dlg/Adjuntos.aspx variants loaded in a real tab (page.goto) vs context.request.get,
// to establish whether the 500s depend on request headers/session state. Read-only GETs.
import { startSession, go, saveEvidence, serverErrorSignature, BASE_URL, logCase, shot } from '../../support/phase4.ts';
const s = await startSession({ name: 'p4-rastreo-adjuntos-recheck' });
const page = s.page;
if (!/Rastreo\.aspx/i.test(page.url())) await go(page, 'Rastreo.aspx');
const base = `${BASE_URL}/dlg/Adjuntos.aspx`;
const variants: [string, string][] = [
  ['missing-c', `${base}?o=Rastreo.aspx&cl=DP01-00306834`],
  ['missing-o', `${base}?cl=DP01-00306834&c=01`],
  ['no-params', `${base}`],
  ['specials', `${base}?o=Rastreo.aspx&cl=%3Cscript%3Ealert(1)%3C%2Fscript%3E&c=%27`],
  ['garbage', `${base}?o=Rastreo.aspx&cl=zzz&c=zzz`],
];
const out: any[] = [];
// A) fresh tab, no Referer, BEFORE ever visiting the dialog with valid params in this session
const p = await s.newPage('nv07-tab');
for (const [label, url] of variants) {
  const resp = await p.goto(url, { waitUntil: 'domcontentloaded' }).catch((e) => null);
  await p.waitForTimeout(500);
  const html = await p.content().catch(() => '');
  out.push({ phase: 'A-fresh-tab-no-prior-valid-visit', label, url, status: resp?.status(), finalUrl: p.url(), sig: serverErrorSignature(html), empty: /No data to display/.test(html) });
}
// B) API-level again (control)
for (const [label, url] of variants) {
  const r = await s.context.request.get(url, { maxRedirects: 0 });
  const body = await r.text();
  out.push({ phase: 'B-request-api', label, url, status: r.status(), location: r.headers()['location'], sig: serverErrorSignature(body) });
}
// C) after one valid visit (session now holds valid params), same tab
await p.goto(`${base}?o=Rastreo.aspx&cl=DP01-00306834&c=01`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(500);
for (const [label, url] of variants) {
  const resp = await p.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => null);
  await p.waitForTimeout(500);
  const html = await p.content().catch(() => '');
  out.push({ phase: 'C-tab-after-valid-visit', label, url, status: resp?.status(), finalUrl: p.url(), sig: serverErrorSignature(html), empty: /No data to display/.test(html) });
  if (label === 'missing-c' && serverErrorSignature(html)) await shot(p, 'RA-15');
}
// D) A 500 in a tab for the screenshot if any occurred in phase A
const firstA = out.find((o) => o.phase.startsWith('A') && o.sig);
if (firstA) { await p.goto(firstA.url, { waitUntil: 'domcontentloaded' }).catch(() => null); await p.waitForTimeout(400); await shot(p, 'RA-15'); }
for (const o of out) console.log(JSON.stringify(o));
saveEvidence('rastreo-NV-07-recheck', out);
logCase({ group: 'rastreo', screen: 'Rastreo > Adjuntos (dlg/Adjuntos.aspx popup)', caseId: 'NV-07', instance: 'dlg/Adjuntos.aspx param variants — tab-level recheck', result: out.some((o) => o.sig) ? 'fail' : 'pass', findingIds: out.some((o) => o.sig) ? ['RA-15'] : [], reason: out.map((o) => `${o.phase.split('-')[0]}/${o.label}:${o.status}${o.sig ? '(500 page)' : ''}`).join(' '), evidence: ['audit/logs/evidence/rastreo-NV-07-recheck.json', 'audit/screenshots/RA-15.png'] });
await p.close();
await s.close();
console.log('done');
