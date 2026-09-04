import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, '..', 'inventory', 'raw');
const OUT_DIR = path.join(__dirname, '..', 'inventory', 'condensed');
fs.mkdirSync(OUT_DIR, { recursive: true });

const formTags = new Set(['input', 'select', 'textarea']);
const interactiveTags = new Set(['a', 'button']);

for (const file of fs.readdirSync(RAW_DIR)) {
  if (!file.endsWith('.json')) continue;
  const raw = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), 'utf-8')) as any[];
  const keep: any[] = [];
  const gridSeen = new Set<string>();

  for (const el of raw) {
    if (!el.visible) continue;
    const cls: string = el.classes || '';

    // Skip decorative/wrapper noise: elements with generic dxgv-ish class but no
    // text, no label, no href, no onclick, not a form field.
    const meaningful =
      formTags.has(el.tag) ||
      el.onclick ||
      (el.tag === 'a' && el.href) ||
      el.text.length > 0 ||
      el.label.length > 0;
    if (!meaningful) continue;

    // Collapse repeated grid header/cell noise: keep only first instance per class signature for table-ish elements
    if (/dxgv/i.test(cls) && !formTags.has(el.tag) && !interactiveTags.has(el.tag)) {
      const sig = cls + '|' + el.tag;
      if (gridSeen.has(sig)) continue;
      gridSeen.add(sig);
    }

    // Skip pure layout <a> with no text/label/href/onclick already filtered above
    if (el.tag === 'a' && !el.href && !el.onclick && !el.text && !el.label) continue;

    keep.push(el);
  }

  fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(keep, null, 2));
  console.log(file, raw.length, '->', keep.length);
}
