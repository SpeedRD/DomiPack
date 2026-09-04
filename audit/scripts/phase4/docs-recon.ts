// Reconnaissance for group `docs`: dump HTML + structural info of the four screens
// (read-only GETs). Output → scratchpad. No case logging here.
import fs from 'fs';
import path from 'path';
import { startSession, go } from '../../support/phase4.ts';

const OUT = '/private/tmp/claude-501/-Users-ed-Projects-DomiPack/396c8fd0-e57a-4acd-b3d8-15c50440348d/scratchpad/recon';
fs.mkdirSync(OUT, { recursive: true });

const s = await startSession({ name: 'p4-docs-recon' });
const page = s.page;
// tsx/esbuild injects `__name(...)` into nested functions inside page.evaluate; shim it in-page.
await page.addInitScript('window.__name = window.__name || function (f) { return f; };');
await page.evaluate('window.__name = window.__name || function (f) { return f; };');

const screens = [
  ['estado', 'Estado.aspx'],
  ['prueba', 'PruebaExportacion.aspx'],
  ['prealerta', 'PreAlerta.aspx'],
  ['pagoonline', 'PagoOnline.aspx'],
] as const;

for (const [slug, rel] of screens) {
  await go(page, rel);
  await page.waitForLoadState('networkidle').catch(() => {});
  const html = await page.content();
  fs.writeFileSync(path.join(OUT, `${slug}.html`), html);
  const info = await page.evaluate(() => {
    const q = (sel: string) => Array.from(document.querySelectorAll(sel));
    const forms = q('form').map((f) => ({
      id: f.id,
      action: f.getAttribute('action'),
      method: f.getAttribute('method'),
      onsubmit: f.getAttribute('onsubmit'),
      enctype: f.getAttribute('enctype'),
    }));
    const fields = q('input,select,textarea,button').map((el) => {
      const e = el as HTMLInputElement;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        name: e.name,
        type: el.getAttribute('type'),
        placeholder: el.getAttribute('placeholder'),
        required: el.hasAttribute('required'),
        maxlength: el.getAttribute('maxlength'),
        pattern: el.getAttribute('pattern'),
        min: el.getAttribute('min'),
        max: el.getAttribute('max'),
        step: el.getAttribute('step'),
        accept: el.getAttribute('accept'),
        multiple: el.hasAttribute('multiple'),
        disabled: e.disabled,
        readOnly: (e as any).readOnly,
        value: e.value?.slice(0, 60),
        ariaLabel: el.getAttribute('aria-label'),
        labels: (e as any).labels ? Array.from((e as any).labels as NodeListOf<HTMLLabelElement>).map((l) => l.textContent?.trim()) : [],
        onclick: el.getAttribute('onclick'),
        onchange: el.getAttribute('onchange'),
        onkeypress: el.getAttribute('onkeypress'),
        title: el.getAttribute('title'),
        visible: cs.display !== 'none' && cs.visibility !== 'hidden' && (el as HTMLElement).offsetParent !== null,
        rect: (el as HTMLElement).getBoundingClientRect().toJSON(),
        options: el.tagName === 'SELECT' ? Array.from((el as unknown as HTMLSelectElement).options).map((o) => ({ v: o.value, t: o.text })) : undefined,
      };
    });
    const validators = (window as any).Page_Validators
      ? Array.from((window as any).Page_Validators as any[]).map((v: any) => ({
          id: v.id,
          controltovalidate: v.controltovalidate,
          errormessage: v.errormessage,
          evaluationfunction: v.evaluationfunction,
          validationGroup: v.validationGroup,
          display: v.display,
        }))
      : null;
    const grid = document.querySelector('#cpBody_gvDatos');
    const gridInfo = grid
      ? {
          headers: q('#cpBody_gvDatos td.dxgvHeader_Office365, #cpBody_gvDatos td.dxgvHeader_Moderno').map((h) => ({
            id: h.id,
            text: h.textContent?.trim(),
            onclick: h.getAttribute('onclick'),
            onmousedown: h.getAttribute('onmousedown'),
            cls: h.className,
          })),
          rows: q('#cpBody_gvDatos tr[id*="DXDataRow"]').map((r) => ({
            id: r.id,
            cls: r.className,
            cells: Array.from(r.querySelectorAll(':scope > td')).map((c) => ({ text: c.textContent?.trim().slice(0, 80), cls: c.className, id: c.id })),
            buttons: Array.from(r.querySelectorAll('a,div[id*="iPrint"],input[type=submit],img')).map((b) => ({
              tag: b.tagName,
              id: b.id,
              cls: b.className,
              title: b.getAttribute('title'),
              alt: b.getAttribute('alt'),
              aria: b.getAttribute('aria-label'),
              role: b.getAttribute('role'),
              href: b.getAttribute('href'),
              onclick: b.getAttribute('onclick'),
              tabindex: b.getAttribute('tabindex'),
              text: b.textContent?.trim().slice(0, 40),
            })),
          })),
          footer: q('#cpBody_gvDatos tr[id*="DXFooterRow"] td').map((c) => c.textContent?.trim()),
          empty: q('#cpBody_gvDatos tr[id*="DXEmptyRow"]').map((c) => c.textContent?.trim()),
          ths: q('#cpBody_gvDatos th').length,
          tables: q('#cpBody_gvDatos table').length,
          role: grid.getAttribute('role'),
          caption: grid.querySelector('caption')?.textContent,
          pager: q('#cpBody_gvDatos .dxpLite_Office365, #cpBody_gvDatos [id*="DXPagerBottom"], #cpBody_gvDatos [id*="DXPagerTop"]').length,
          filterRow: q('#cpBody_gvDatos [id*="DXFilterRow"], #cpBody_gvDatos .dxgvFilterRow_Office365').length,
          scrollWrapper: (() => {
            let el: HTMLElement | null = grid as HTMLElement;
            const chain: string[] = [];
            while (el && el !== document.body) {
              const cs = getComputedStyle(el);
              chain.push(`${el.tagName.toLowerCase()}#${el.id}.${el.className.toString().replace(/\s+/g, '.')}[ox=${cs.overflowX}]`);
              el = el.parentElement;
            }
            return chain.slice(0, 8);
          })(),
        }
      : null;
    const scripts = q('script').map((sc) => ({ src: sc.getAttribute('src'), inline: sc.getAttribute('src') ? null : sc.textContent?.slice(0, 4000) }));
    const dxScripts = scripts.filter((x) => x.inline && /cpBody_gvDatos|ASPxClientGridView|callBack|Callback/i.test(x.inline!)).map((x) => x.inline);
    const labels = q('label').map((l) => ({ for: l.getAttribute('for'), text: l.textContent?.trim().slice(0, 60) }));
    const headings = q('h1,h2,h3,h4,h5,.page-title-heading,.page-title-subheading,.card-title').map((h) => ({ tag: h.tagName, text: h.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) }));
    return {
      title: document.title,
      url: location.href,
      forms,
      fields,
      validators,
      gridInfo,
      labels,
      headings,
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 3000),
      dxScripts,
      inlineScripts: scripts.filter((x) => x.inline).map((x) => x.inline),
      externalScripts: scripts.filter((x) => x.src).map((x) => x.src),
    };
  });
  fs.writeFileSync(path.join(OUT, `${slug}-info.json`), JSON.stringify(info, null, 2));
  console.log(`${slug}: title=${info.title} url=${info.url} fields=${info.fields.length} rows=${info.gridInfo?.rows.length} validators=${JSON.stringify(info.validators)}`);
}
await s.close();
console.log('done');
