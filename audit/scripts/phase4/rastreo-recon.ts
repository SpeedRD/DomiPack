// Recon for the rastreo group: capture Rastreo.aspx HTML, inline scripts (VerGuia/Filtro),
// modal DOM, and Menu dropdown markup. Read-only.
import fs from 'fs';
import path from 'path';
import { startSession, go, saveText } from '../../support/phase4.ts';

const OUT = '/private/tmp/claude-501/-Users-ed-Projects-DomiPack/396c8fd0-e57a-4acd-b3d8-15c50440348d/scratchpad';
fs.mkdirSync(OUT, { recursive: true });

const s = await startSession({ name: 'p4-rastreo-recon' });
const page = s.page;
console.log('after login url=', page.url());
if (!/Rastreo\.aspx/i.test(page.url())) await go(page, 'Rastreo.aspx');
await page.waitForLoadState('networkidle').catch(() => {});

const html = await page.content();
fs.writeFileSync(path.join(OUT, 'rastreo.html'), html);
console.log('html length', html.length);

const info = await page.evaluate(() => {
  const scripts = Array.from(document.querySelectorAll('script')).map((sc) => ({
    src: sc.getAttribute('src'),
    inline: sc.src ? null : sc.textContent,
  }));
  const modalH = document.querySelector('#modal_Historial');
  const menu = document.querySelector('#cpBody_bpagar');
  const menuParent = menu?.parentElement;
  const popups = Array.from(document.querySelectorAll('[id*="ppCambioGuia"]')).map((e) => ({ id: e.id, tag: e.tagName, cls: e.className, display: getComputedStyle(e as HTMLElement).display }));
  return {
    title: document.title,
    modalHistorialHTML: modalH?.outerHTML,
    menuParentHTML: menuParent?.outerHTML,
    popups,
    gridRows: Array.from(document.querySelectorAll('#cpBody_gvDatos tr')).map((r) => ({ id: r.id, cls: r.className, text: (r as HTMLElement).innerText.replace(/\s+/g, ' ').slice(0, 200) })),
    adjuntosLinks: Array.from(document.querySelectorAll('a[href*="Adjuntos.aspx"]')).map((a) => (a as HTMLAnchorElement).getAttribute('href')),
    verGuiaLinks: Array.from(document.querySelectorAll('a[onclick*="VerGuia"]')).map((a) => a.getAttribute('onclick')),
    bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
    scripts,
  };
});
fs.writeFileSync(path.join(OUT, 'rastreo-info.json'), JSON.stringify(info, null, 2));
const inline = info.scripts.filter((x) => x.inline).map((x, i) => `/* ---- inline #${i} ---- */\n${x.inline}`).join('\n\n');
fs.writeFileSync(path.join(OUT, 'rastreo-inline.js'), inline);
saveText('rastreo-inline-scripts', inline, 'js');
console.log('scripts:', info.scripts.map((x) => x.src || `[inline ${x.inline?.length}]`).join(' | '));
console.log('gridRows:', JSON.stringify(info.gridRows, null, 1));
console.log('adjuntos:', info.adjuntosLinks, 'verguia:', info.verGuiaLinks);
console.log('popups:', JSON.stringify(info.popups));
console.log('menuParent:', info.menuParentHTML);
console.log('modal:', info.modalHistorialHTML);

// Fetch external site-specific scripts
for (const sc of info.scripts) {
  if (sc.src && !/jquery|bootstrap|modernizr|sweetalert|popper|waves|DXR\.axd|WebResource|ScriptResource/i.test(sc.src)) {
    const abs = new URL(sc.src, page.url()).href;
    const r = await page.request.get(abs);
    const body = await r.text();
    fs.writeFileSync(path.join(OUT, `rastreo-ext-${path.basename(sc.src.split('?')[0])}`), `// ${abs} -> ${r.status()}\n` + body);
    console.log('  fetched', abs, r.status(), body.length);
  }
}
await s.close();
console.log('done');
