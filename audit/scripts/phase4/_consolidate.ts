// Consolidates Phase 4 worker output:
//   audit/reports/execution-log/<group>.jsonl  -> coverage table in audit/reports/execution-log.md
//   audit/findings/partial/<group>.json        -> audit/findings/findings.json (validated, sorted)
// Run: npx tsx audit/scripts/phase4/_consolidate.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT = path.join(__dirname, '..', '..');
const LOG_DIR = path.join(AUDIT, 'reports', 'execution-log');
const PARTIAL_DIR = path.join(AUDIT, 'findings', 'partial');
const FINDINGS = path.join(AUDIT, 'findings', 'findings.json');
const MASTER = path.join(AUDIT, 'reports', 'execution-log.md');

type Result = 'pass' | 'fail' | 'omitted' | 'executed-static';
interface CaseRec {
  group: string; screen: string; caseId: string; instance: string; result: Result;
  findingIds?: string[]; reason?: string; evidence?: string[]; ts: string;
}

const CATS = ['funcional', 'servidor', 'validacion', 'ux-ui', 'responsive', 'accesibilidad', 'copy-contenido', 'robustez'];
const SEVS = ['bloqueante', 'critico', 'mayor', 'menor'];
const REQUIRED = ['id', 'pantalla', 'url', 'componente', 'categoria', 'severidad', 'descripcion', 'pasos_para_reproducir',
  'comportamiento_actual', 'comportamiento_esperado', 'impacto_usuario', 'evidencia', 'propuesta_preliminar', 'info_tecnica', 'patron_relacionado'];

// ---------- cases ----------
const cases: CaseRec[] = [];
const groupsSeen: string[] = [];
if (fs.existsSync(LOG_DIR)) {
  const all = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith('.jsonl')).sort();
  // A worker may leave <group>.dedup.jsonl next to the raw <group>.jsonl; prefer the dedup file.
  const files = all.filter((f) => f.endsWith('.dedup.jsonl') || !all.includes(f.replace('.jsonl', '.dedup.jsonl')));
  for (const f of files) {
    groupsSeen.push(f.replace('.dedup.jsonl', '').replace('.jsonl', ''));
    const lines = fs.readFileSync(path.join(LOG_DIR, f), 'utf8').split('\n').filter(Boolean);
    for (const l of lines) {
      try { cases.push(JSON.parse(l)); } catch { console.warn('bad jsonl line in', f, l.slice(0, 80)); }
    }
  }
}
// de-dupe: last record for the same (group, screen, caseId, instance) wins
const key = (c: CaseRec) => `${c.group}|${c.screen}|${c.caseId}|${c.instance}`;
const latest = new Map<string, CaseRec>();
for (const c of cases) latest.set(key(c), c);
const uniq = [...latest.values()];

interface Row { applicable: number; executed: number; passed: number; failed: number; omitted: number; static: number; findings: Set<string>; omittedList: CaseRec[] }
const byScreen = new Map<string, Row>();
const row = (s: string) => {
  if (!byScreen.has(s)) byScreen.set(s, { applicable: 0, executed: 0, passed: 0, failed: 0, omitted: 0, static: 0, findings: new Set(), omittedList: [] });
  return byScreen.get(s)!;
};
for (const c of uniq) {
  const r = row(`${c.group} / ${c.screen}`);
  r.applicable++;
  if (c.result === 'omitted') { r.omitted++; r.omittedList.push(c); continue; }
  r.executed++;
  if (c.result === 'pass') r.passed++;
  if (c.result === 'fail') r.failed++;
  if (c.result === 'executed-static') r.static++;
  for (const id of c.findingIds || []) r.findings.add(id);
}

// ---------- findings ----------
const findings: any[] = [];
const problems: string[] = [];
if (fs.existsSync(PARTIAL_DIR)) {
  for (const f of fs.readdirSync(PARTIAL_DIR).filter((f) => f.endsWith('.json')).sort()) {
    let arr: any[] = [];
    try { arr = JSON.parse(fs.readFileSync(path.join(PARTIAL_DIR, f), 'utf8')); } catch (e) { problems.push(`${f}: invalid JSON (${e})`); continue; }
    if (!Array.isArray(arr)) { problems.push(`${f}: not an array`); continue; }
    for (const fi of arr) {
      for (const k of REQUIRED) if (!(k in fi)) problems.push(`${f} ${fi.id || '?'}: missing field ${k}`);
      if (!CATS.includes(fi.categoria)) problems.push(`${f} ${fi.id}: bad categoria ${fi.categoria}`);
      if (!SEVS.includes(fi.severidad)) problems.push(`${f} ${fi.id}: bad severidad ${fi.severidad}`);
      if (!Array.isArray(fi.pasos_para_reproducir)) problems.push(`${f} ${fi.id}: pasos_para_reproducir must be an array`);
      const shotPath = path.join(AUDIT, 'screenshots', `${fi.id}.png`);
      if (!fs.existsSync(shotPath)) problems.push(`${f} ${fi.id}: missing screenshot audit/screenshots/${fi.id}.png`);
      for (const ev of fi.evidencia || []) {
        const p = path.join(AUDIT, '..', ev);
        if (!fs.existsSync(p)) problems.push(`${f} ${fi.id}: evidence path not found ${ev}`);
      }
      // Phase 7 owns patron_relacionado. Workers sometimes wrote a hint there — keep the
      // hint in an extra field and null the schema field.
      if (fi.patron_relacionado !== null && fi.patron_relacionado !== undefined) {
        if (!fi.patron_sugerido_fase7) fi.patron_sugerido_fase7 = fi.patron_relacionado;
        fi.patron_relacionado = null;
      }
      if (fi.patron_relacionado === undefined) fi.patron_relacionado = null;
      findings.push(fi);
    }
  }
}
const ids = findings.map((f) => f.id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dup.length) problems.push(`duplicate finding ids: ${[...new Set(dup)].join(', ')}`);
findings.sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }));
fs.writeFileSync(FINDINGS, JSON.stringify(findings, null, 2));

// ---------- master log ----------
const totals = { applicable: 0, executed: 0, passed: 0, failed: 0, omitted: 0, static: 0 };
let table = '| Screen (group / screen) | Applicable | Executed | Passed | Failed (cases → findings) | Executed-static | Omitted |\n|---|---|---|---|---|---|---|\n';
for (const [s, r] of [...byScreen.entries()].sort()) {
  table += `| ${s} | ${r.applicable} | ${r.executed} | ${r.passed} | ${r.failed} (${r.findings.size} findings) | ${r.static} | ${r.omitted} |\n`;
  totals.applicable += r.applicable; totals.executed += r.executed; totals.passed += r.passed; totals.failed += r.failed; totals.omitted += r.omitted; totals.static += r.static;
}
table += `| **Total** | **${totals.applicable}** | **${totals.executed}** | **${totals.passed}** | **${totals.failed}** (${findings.length} findings in findings.json) | **${totals.static}** | **${totals.omitted}** |\n`;

let omitted = '';
for (const [s, r] of [...byScreen.entries()].sort()) {
  for (const c of r.omittedList) omitted += `- ${s} — **${c.caseId}** (${c.instance}): ${c.reason || '(no reason given)'}\n`;
}
if (!omitted) omitted = '_None._\n';

const bySev: Record<string, number> = {};
const byCat: Record<string, number> = {};
for (const f of findings) { bySev[f.severidad] = (bySev[f.severidad] || 0) + 1; byCat[f.categoria] = (byCat[f.categoria] || 0) + 1; }

let master = fs.existsSync(MASTER) ? fs.readFileSync(MASTER, 'utf8') : '';
const replaceSection = (heading: string, body: string) => {
  const re = new RegExp(`(## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)([\\s\\S]*?)(?=\\n## |$)`);
  if (re.test(master)) master = master.replace(re, `$1\n${body}\n`);
  else master += `\n## ${heading}\n\n${body}\n`;
};
replaceSection('Coverage (consolidated)', `_Refreshed ${new Date().toISOString()} from ${groupsSeen.join(', ') || 'no'} group logs. "Applicable" = case × component-instance rows logged; "Executed" = pass + fail + executed-static._\n\n${table}\nFindings by severity: ${JSON.stringify(bySev)}; by category: ${JSON.stringify(byCat)}.`);
replaceSection('Omitted cases (with reason)', omitted);
fs.writeFileSync(MASTER, master);

console.log(table);
console.log('findings:', findings.length, bySev, byCat);
if (problems.length) { console.log('\nVALIDATION PROBLEMS:'); for (const p of problems) console.log(' -', p); }
else console.log('validation: OK');
