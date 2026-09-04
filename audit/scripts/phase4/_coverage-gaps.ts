// Compares the case ids logged per screen against the §13 applicability map of
// audit/matrix/test-matrix.md and prints case ids that were never logged (in any
// result state). Screen matching is by keyword on the logged `screen` field.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', '..', 'reports', 'execution-log');

const TF = ['TF-01','TF-02','TF-03','TF-04','TF-05','TF-06','TF-07','TF-08','TF-09','TF-10','TF-11','TF-12'];
const EM = ['EM-01','EM-02','EM-03','EM-04','EM-05','EM-06','EM-07','EM-08'];
const PH = ['PH-01','PH-02','PH-03','PH-04','PH-05','PH-06','PH-07'];
const RS = ['RS-01','RS-02','RS-03'];
const AX = ['AX-01','AX-02','AX-03','AX-04','AX-05'];
const CC = ['CC-01','CC-03'];
const DS = ['DS-01','DS-02','DS-03','DS-04','DS-05','DS-06','DS-07'];
const MD = ['MD-01','MD-02','MD-03','MD-04','MD-05','MD-06','MD-07','MD-08','MD-09','MD-10'];
const DR = ['DR-01','DR-02','DR-03','DR-04','DR-05','DR-06','DR-07','DR-10'];

// §13 map (screen keyword → expected case ids). Keywords match the logged `screen` field (case-insensitive substring).
const EXPECTED: Record<string, string[]> = {
  'Login': [...TF.filter(c => !['TF-08','TF-11','TF-12'].includes(c)), 'PW-01','PW-02','PW-06','CB-01','BT-01','BT-04','BT-05','BT-10','NV-05','NV-08','NV-10', ...RS, ...AX, ...CC],
  'Nueva Cuenta': [...TF, ...EM, ...PH, 'PW-03','PW-04','PW-05','SL-01','SL-02','SL-03','SL-06','SL-07','DR-08','CB-01','CC-05','BT-02','BT-03', ...RS, ...AX],
  'Datos Personales': [...TF, 'EM-07', ...PH.filter(c => c !== 'PH-03' && c !== 'PH-07'), 'PW-07','SL-04','BT-02','BT-03','NV-03','NV-04', ...RS, ...AX],
  'Dependientes': [...TF, ...EM.filter(c => !['EM-03','EM-04','EM-07'].includes(c)), 'PH-03','TB-01','TB-08','BT-02','BT-03', ...AX],
  'Direccion': [...DS, 'SL-04','SL-05','TF-11','CB-01','TB-01','BT-02','BT-03','AX-05'],
  'Estado': ['TB-01','TB-03','TB-04','TB-07','TB-08','TB-09','TB-12','TB-10','NV-01','NV-03', ...RS, ...AX],
  'Rastreo': ['TB-05','TB-06','TB-07','TB-08', ...DR, 'DR-09', ...MD, 'BT-01','BT-06','NV-01','NV-02','NV-06','NV-07', ...RS, ...AX, 'CC-02'],
  'Prueba': ['TB-01','TB-03','TB-04','TB-06','TB-07','TB-08','TB-10','TB-12', ...RS, ...AX],
  'PreAlerta': [...TF, 'SL-01','SL-07','FU-01','TB-01','BT-02','BT-03', ...RS, ...AX, 'NM-01','NM-02','NM-03','NM-04','NM-05'],
  'PagoOnline': ['TB-11','BT-09','NV-06', ...RS, ...AX],
  'Shared chrome': ['BT-06','BT-08','MD-10','NV-09','RS-05','AX-03','CC-04'],
};

const logged = new Map<string, Set<string>>();
const all = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.jsonl')).sort();
const files = all.filter(f => f.endsWith('.dedup.jsonl') || !all.includes(f.replace('.jsonl', '.dedup.jsonl')));
for (const f of files) for (const l of fs.readFileSync(path.join(LOG_DIR, f), 'utf8').split('\n').filter(Boolean)) {
  try {
    const r = JSON.parse(l);
    for (const k of Object.keys(EXPECTED)) {
      if (String(r.screen).toLowerCase().includes(k.toLowerCase())) {
        if (!logged.has(k)) logged.set(k, new Set());
        logged.get(k)!.add(r.caseId);
      }
    }
  } catch {}
}
for (const [k, exp] of Object.entries(EXPECTED)) {
  const got = logged.get(k) || new Set();
  const missing = exp.filter(c => !got.has(c));
  console.log(`${k.padEnd(16)} logged=${got.size.toString().padStart(3)}  missing(${missing.length}): ${missing.join(', ') || '-'}`);
}
