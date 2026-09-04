// Static inspection of Login.aspx and NuevaCuenta.aspx: HTML, inline scripts,
// form attributes, validators. Read-only (GET only). Output → scratchpad + evidence.
import fs from 'fs';
import path from 'path';
import { startSession, BASE_URL, AUDIT_ROOT, saveText } from '../../support/phase4.ts';

const OUT = '/private/tmp/claude-501/-Users-ed-Projects-DomiPack/396c8fd0-e57a-4acd-b3d8-15c50440348d/scratchpad';
fs.mkdirSync(OUT, { recursive: true });

const s = await startSession({ name: 'p4-login-static', auth: false });
const page = s.page;

for (const [slug, rel] of [
  ['login', 'Login.aspx'],
  ['nueva-cuenta', 'NuevaCuenta.aspx'],
] as const) {
  await page.goto(`${BASE_URL}/${rel}`, { waitUntil: 'networkidle' });
  const html = await page.content();
  fs.writeFileSync(path.join(OUT, `${slug}.html`), html);
  const info = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script')).map((sc) => ({
      src: sc.getAttribute('src'),
      inline: sc.src ? null : sc.textContent,
    }));
    const forms = Array.from(document.querySelectorAll('form')).map((f) => ({
      id: f.id,
      action: f.getAttribute('action'),
      method: f.getAttribute('method'),
      onsubmit: f.getAttribute('onsubmit'),
      novalidate: f.hasAttribute('novalidate'),
    }));
    const fields = Array.from(document.querySelectorAll('input,select,textarea,button,a[onclick],a[href]')).map((el) => {
      const e = el as HTMLInputElement;
      const cs = getComputedStyle(el);
      const labels = (e as any).labels ? Array.from((e as any).labels as NodeListOf<HTMLLabelElement>).map((l) => l.textContent?.trim()) : [];
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        name: (el as any).name,
        type: el.getAttribute('type'),
        placeholder: el.getAttribute('placeholder'),
        required: el.hasAttribute('required'),
        maxlength: el.getAttribute('maxlength'),
        pattern: el.getAttribute('pattern'),
        autocomplete: el.getAttribute('autocomplete'),
        disabled: (e as any).disabled ?? null,
        checked: e.type === 'checkbox' ? e.checked : null,
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledby: el.getAttribute('aria-labelledby'),
        labels,
        onclick: el.getAttribute('onclick'),
        onchange: el.getAttribute('onchange'),
        href: el.getAttribute('href'),
        text: (el.textContent || '').trim().slice(0, 80),
        value: el.tagName === 'INPUT' && (el.getAttribute('type') === 'submit' || el.getAttribute('type') === 'button') ? e.value : undefined,
        visible: cs.display !== 'none' && cs.visibility !== 'hidden' && (el as HTMLElement).offsetParent !== null,
        options: el.tagName === 'SELECT' ? Array.from((el as unknown as HTMLSelectElement).options).map((o) => ({ v: o.value, t: o.text })) : undefined,
        tabindex: el.getAttribute('tabindex'),
      };
    });
    return { title: document.title, forms, fields, scripts, bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim() };
  });
  fs.writeFileSync(path.join(OUT, `${slug}-info.json`), JSON.stringify(info, null, 2));
  console.log(slug, 'title=', info.title, 'forms=', JSON.stringify(info.forms));
  console.log(slug, 'scripts:', info.scripts.map((x) => x.src || `[inline ${x.inline?.length} chars]`).join(' | '));
  // external site-specific scripts: fetch their bodies
  for (const sc of info.scripts) {
    if (sc.src && !/jquery|bootstrap|modernizr|sweetalert|popper|waves|jquery\.|\/lib\//i.test(sc.src)) {
      const abs = new URL(sc.src, `${BASE_URL}/${rel}`).href;
      const r = await page.request.get(abs);
      const body = await r.text();
      const fname = `${slug}-ext-${path.basename(sc.src.split('?')[0])}`;
      fs.writeFileSync(path.join(OUT, fname), `// ${abs} -> ${r.status()}\n` + body);
      console.log('  fetched', abs, r.status(), body.length);
    }
  }
  // Save a copy of inline scripts as evidence for static analysis
  const inline = info.scripts.filter((x) => x.inline).map((x, i) => `/* ---- inline #${i} ---- */\n${x.inline}`).join('\n\n');
  saveText(`${slug}-inline-scripts`, inline, 'js');
}
await s.close();
console.log('done');
