// Appends late criterion corrections, then dedupes audit/reports/execution-log/rastreo.jsonl
// (last record per screen×caseId×instance wins) into rastreo.dedup.jsonl and prints counts per screen.
import fs from 'fs';
import path from 'path';
import { logCase, AUDIT_ROOT } from '../../support/phase4.ts';
const G = 'rastreo';
logCase({ group: G, screen: 'Rastreo > Historial Guías (modal)', caseId: 'DR-01', instance: '#cpBody_lDesde/#cpBody_lHasta + Buscar (Filtro())', result: 'fail', findingIds: ['RA-10'], reason: 'CORRECTION: no crash (200), but the inverted range is accepted silently and the grid shows the DevExpress "No data to display" — an empty, confusing result with no validation message (matrix expects rejection with a message OR a non-confusing result)', evidence: ['audit/logs/evidence/rastreo-historial-DR-01-inverted.json', 'audit/screenshots/rastreo-historial-DR-01-inverted.png'] });
logCase({ group: G, screen: 'Rastreo > Historial Guías (modal)', caseId: 'TB-02', instance: '#cpBody_gvDatos after Historial filter matching nothing', result: 'fail', findingIds: ['RA-10', 'RA-20'], reason: 'CORRECTION: "no results for filter" is indistinguishable from "no data at all" (same "No data to display"), the active date range is not shown anywhere on the page, and there is no filter reset; the filtered set persists for the session (see RA-20)', evidence: ['audit/logs/evidence/rastreo-historial-DR-06-future.json', 'audit/screenshots/rastreo-historial-DR-06-future.png'] });
logCase({ group: G, screen: 'Rastreo > Historial Guías (modal)', caseId: 'MD-08', instance: '#modal_Historial Buscar → result rendering', result: 'fail', findingIds: ['RA-20'], reason: 'CORRECTION: Buscar triggers a full postback; the modal closes and the results replace the main grid (10 rows) — the modal is not left in limbo, BUT the page gives no indication of the active filter (dates only visible by reopening the modal), there is no reset, and the filtered view persists across Back/Forward/reload/new navigation for the whole session', evidence: ['audit/logs/evidence/rastreo-historial-control-wide.json', 'audit/screenshots/rastreo-historial-control-wide.png', 'audit/logs/evidence/rastreo-NV-01-02-historial.json'] });

logCase({ group: G, screen: 'Rastreo > Historial Guías (modal)', caseId: 'DR-03', instance: '#cpBody_lDesde/#cpBody_lHasta + Buscar (Filtro())', result: 'fail', findingIds: ['RA-03'], reason: 'both dates empty + Buscar → POST Rastreo.aspx HTTP 500, raw ASP.NET "Server Error in \'/\' Application / Runtime Error" page (828 ms); app chrome lost', evidence: ['audit/logs/evidence/rastreo-historial-DR-03-empty.json', 'audit/logs/evidence/rastreo-historial-DR-03-empty-response.html', 'audit/screenshots/rastreo-historial-DR-03-empty.png'] });
logCase({ group: G, screen: 'Rastreo > Historial Guías (modal)', caseId: 'DR-04', instance: '#cpBody_lDesde/#cpBody_lHasta + Buscar (Filtro())', result: 'fail', findingIds: ['RA-03'], reason: 'only Desde (2026-01-01) → HTTP 500 Runtime Error; only Hasta (2026-12-31) → HTTP 500 Runtime Error', evidence: ['audit/logs/evidence/rastreo-historial-DR-04-onlyDesde.json', 'audit/logs/evidence/rastreo-historial-DR-04-onlyHasta.json', 'audit/screenshots/rastreo-historial-DR-04-onlyDesde.png'] });

const file = path.join(AUDIT_ROOT, 'reports', 'execution-log', 'rastreo.jsonl');
const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const map = new Map<string, any>();
for (const r of lines) map.set(`${r.screen}|${r.caseId}|${r.instance}`, r);
const dedup = Array.from(map.values());
fs.writeFileSync(path.join(AUDIT_ROOT, 'reports', 'execution-log', 'rastreo.dedup.jsonl'), dedup.map((r) => JSON.stringify(r)).join('\n') + '\n');
const counts: Record<string, any> = {};
for (const r of dedup) {
  const c = (counts[r.screen] ||= { applicable: 0, executed: 0, pass: 0, fail: 0, omitted: 0, 'executed-static': 0, findings: new Set<string>() });
  c.applicable++;
  if (r.result !== 'omitted') c.executed++;
  c[r.result]++;
  for (const f of r.findingIds || []) c.findings.add(f);
}
console.log(`raw=${lines.length} dedup=${dedup.length}`);
for (const [k, v] of Object.entries(counts)) console.log(`${k} :: applicable=${v.applicable} executed=${v.executed} pass=${v.pass} fail=${v.fail} static=${v['executed-static']} omitted=${v.omitted} findings=${[...v.findings].sort().join(',')}`);
console.log('OMITTED:');
for (const r of dedup.filter((x) => x.result === 'omitted')) console.log(` - ${r.screen} ${r.caseId} ${r.instance} :: ${r.reason}`);
console.log('ALL (sorted):');
for (const r of dedup.sort((a, b) => (a.screen + a.caseId).localeCompare(b.screen + b.caseId))) console.log(` ${r.result.padEnd(15)} ${r.screen} | ${r.caseId} | ${r.instance} -> ${(r.findingIds || []).join(',')}`);
