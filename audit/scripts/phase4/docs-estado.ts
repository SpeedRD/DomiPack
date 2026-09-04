// Estado de Cuenta (Estado.aspx) — grid cases without the PDF clicks (those live in docs-estado-pdf.ts).
// Cases: TB-01/03/04/08/09/12, NV-03, BT-06/11, CC-01.
import { startSession, go, shot, saveEvidence, serverErrorSignature, visibleText } from '../../support/phase4.ts';
import { shimName, L, SCREEN, tabTraverse } from './docs-common.ts';

const s = await startSession({ name: 'p4-docs-estado' });
const page = s.page;
await shimName(page);
const SC = SCREEN.estado;
await go(page, 'Estado.aspx');
await page.waitForLoadState('networkidle').catch(() => {});

async function gridSnapshot() {
  return page.evaluate(() => {
    const g = document.querySelector('#cpBody_gvDatos');
    const rows = Array.from(document.querySelectorAll('#cpBody_gvDatos tr[id*="DXDataRow"]')).map((r) => ({
      id: r.id,
      cells: Array.from(r.querySelectorAll(':scope > td')).map((c) => c.textContent?.replace(/<!--[\s\S]*?-->/g, '').trim().slice(0, 60)),
    }));
    const footer = Array.from(document.querySelectorAll('#cpBody_gvDatos tr[id*="DXFooterRow"] td')).map((c) => c.textContent?.trim());
    const headers = Array.from(document.querySelectorAll('#cpBody_gvDatos td[class*="dxgvHeader"]')).map((h) => ({
      id: h.id,
      text: h.textContent?.trim(),
      sortImg: !!h.querySelector('img[class*="Sort"], .dxGridView_gvHeaderSortDown, .dxGridView_gvHeaderSortUp'),
      cursor: getComputedStyle(h).cursor,
      role: h.getAttribute('role'),
      ariaSort: h.getAttribute('aria-sort'),
    }));
    return {
      rows,
      footer,
      headers,
      ths: g ? g.querySelectorAll('th').length : null,
      caption: !!g?.querySelector('caption'),
      role: g?.getAttribute('role'),
      summary: g?.getAttribute('summary'),
      pager: document.querySelectorAll('#cpBody_gvDatos [id*="DXPager"], #cpBody_gvDatos .dxpLite_Office365').length,
      filterRow: document.querySelectorAll('#cpBody_gvDatos [id*="DXFilterRow"]').length,
      searchPanel: document.querySelectorAll('#cpBody_gvDatos [id*="DXSE"], #cpBody_gvDatos input[type=text]').length,
      emptyRow: document.querySelectorAll('#cpBody_gvDatos [id*="DXEmptyRow"]').length,
      pageTitle: document.querySelector('.page-title-heading')?.textContent?.replace(/\s+/g, ' ').trim(),
      printButtons: Array.from(document.querySelectorAll('#cpBody_gvDatos div[id*="iPrint"]:not([id$="_CD"])')).map((b) => {
        const img = b.querySelector('img');
        const input = b.querySelector('input');
        return {
          id: b.id,
          role: b.getAttribute('role'),
          ariaLabel: b.getAttribute('aria-label'),
          title: b.getAttribute('title'),
          tabindex: b.getAttribute('tabindex'),
          text: b.textContent?.trim(),
          imgAlt: img?.getAttribute('alt'),
          imgTitle: img?.getAttribute('title'),
          imgClass: img?.className,
          inputType: input?.getAttribute('type'),
          inputValue: (input as HTMLInputElement | null)?.value,
          inputSize: input ? `${input.getBoundingClientRect().width}x${input.getBoundingClientRect().height}` : null,
          size: `${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`,
        };
      }),
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1500),
    };
  });
}

const snap = await gridSnapshot();
const snapEv = saveEvidence('estado-grid-snapshot', snap);
const baseShot = await shot(page, 'estado-1440');
console.log(JSON.stringify({ headers: snap.headers, rows: snap.rows, footer: snap.footer, ths: snap.ths, pager: snap.pager, filter: snap.filterRow, print: snap.printButtons }, null, 1));

// TB-01 empty state — grid is not empty for this account
L(SC, 'TB-01', '#cpBody_gvDatos', 'omitted', { reason: `La cuenta de prueba tiene ${snap.rows.length} filas; no se puede observar el estado vacío (DXEmptyRow=${snap.emptyRow})` });
// TB-03 high volume
L(SC, 'TB-03', '#cpBody_gvDatos', 'omitted', { reason: 'No hay cuenta/periodo de alto volumen disponible (3 filas); sin filtro de fechas para forzar un dataset mayor' });
// TB-04 absence of filter/search/pager
L(SC, 'TB-04', '#cpBody_gvDatos', 'fail', {
  findingIds: ['EC-01'],
  reason: `pager=${snap.pager} filterRow=${snap.filterRow} searchPanel=${snap.searchPanel}; sin filtro por periodo/estado en toda la pantalla`,
  evidence: [snapEv, baseShot],
});
// TB-08 table semantics
L(SC, 'TB-08', '#cpBody_gvDatos', snap.ths === 0 ? 'fail' : 'pass', {
  findingIds: snap.ths === 0 ? ['EC-02'] : [],
  reason: `th=${snap.ths} caption=${snap.caption} role=${snap.role}; cabeceras como <td class=dxgvHeader>; footer sin etiqueta de 'Total'`,
  evidence: [snapEv],
});
// TB-09 footer math
const num = (t: string | undefined) => parseFloat((t || '0').replace(/,/g, ''));
const sums = { total: 0, debito: 0, credito: 0, balance: 0 };
for (const r of snap.rows) {
  sums.total += num(r.cells[3]);
  sums.debito += num(r.cells[4]);
  sums.credito += num(r.cells[5]);
  sums.balance += num(r.cells[6]);
}
const footerVals = { total: num(snap.footer[3]), debito: num(snap.footer[4]), credito: num(snap.footer[5]), balance: num(snap.footer[6]) };
const mathOk = Math.abs(sums.total - footerVals.total) < 0.005 && Math.abs(sums.balance - footerVals.balance) < 0.005 && Math.abs(sums.debito - footerVals.debito) < 0.005 && Math.abs(sums.credito - footerVals.credito) < 0.005;
console.log('TB-09 sums', sums, 'footer', footerVals, 'ok', mathOk);
L(SC, 'TB-09', '#cpBody_gvDatos_DXFooterRow', mathOk ? 'pass' : 'fail', {
  findingIds: mathOk ? [] : ['EC-03'],
  reason: `Suma filas=${JSON.stringify(sums)} footer=${JSON.stringify(footerVals)}; el footer no lleva etiqueta ('Total') ni moneda; 'Dias Vencidos' muestra valores negativos (${snap.rows.map((r) => r.cells[7]).join(', ')})`,
  evidence: [snapEv, baseShot],
});

// TB-12 sort: click each header, watch for a callback request and row order change
const sortResults: any[] = [];
for (const h of snap.headers.filter((x) => x.text)) {
  const before = (await gridSnapshot()).rows.map((r) => r.cells[1]).join('|');
  const reqs: string[] = [];
  const onReq = (req: any) => { if (req.method() === 'POST') reqs.push(`${req.method()} ${req.url()}`); };
  page.on('request', onReq);
  let err: string | null = null;
  try {
    await page.click(`#${h.id}`, { timeout: 5000 });
    await page.waitForTimeout(2500);
  } catch (e: any) {
    err = e.message?.slice(0, 120);
  }
  page.off('request', onReq);
  const after = await gridSnapshot();
  const afterKeys = after.rows.map((r) => r.cells[1]).join('|');
  const hdr = after.headers.find((x) => x.id === h.id);
  const html = await page.content();
  sortResults.push({ header: h.text, id: h.id, before, after: afterKeys, changed: before !== afterKeys, posts: reqs, sortImg: hdr?.sortImg, ariaSort: hdr?.ariaSort, err, serverError: serverErrorSignature(html) });
  console.log('sort', h.text, 'changed', before !== afterKeys, 'posts', reqs.length, 'sortImg', hdr?.sortImg, err || '');
}
const sortEv = saveEvidence('estado-sort-attempts', sortResults);
const anySort = sortResults.some((r) => r.changed || r.sortImg);
await shot(page, 'estado-after-sort-clicks');
L(SC, 'TB-12', '#cpBody_gvDatos cabeceras', anySort ? 'pass' : 'executed-static', {
  reason: anySort ? `Ordenación activa en: ${sortResults.filter((r) => r.changed || r.sortImg).map((r) => r.header).join(', ')}` : `Ninguna cabecera ordena (sin callback, sin cambio de orden, sin indicador); cabeceras no interactivas — no aplica ordenación`,
  evidence: [sortEv, 'audit/screenshots/estado-after-sort-clicks.png'],
});

// NV-03 refresh (no unsaved input on this screen)
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
const afterReload = await gridSnapshot();
const reloadHtml = await page.content();
L(SC, 'NV-03', 'Estado.aspx (F5)', serverErrorSignature(reloadHtml) || afterReload.rows.length !== snap.rows.length ? 'fail' : 'pass', {
  reason: `Tras recargar: ${afterReload.rows.length} filas, url=${page.url()}, error=${serverErrorSignature(reloadHtml)}`,
});

// BT-06 accessible name of per-row print icon
const noName = snap.printButtons.filter((b) => !b.ariaLabel && !b.title && !b.text && !b.imgAlt && !b.imgTitle);
L(SC, 'BT-06', snap.printButtons.map((b) => '#' + b.id).join(', '), noName.length ? 'fail' : 'pass', {
  findingIds: noName.length ? ['EC-04'] : [],
  reason: `${noName.length}/${snap.printButtons.length} iconos sin nombre accesible (div sin role/aria-label, img alt="" , input submit oculto 0x0 con value='submit'); tamaño ${snap.printButtons[0]?.size}`,
  evidence: [snapEv],
});

// BT-11 focus visibility & tab order
const stops = await tabTraverse(page, 40);
const stopsEv = saveEvidence('estado-tab-order', stops);
const printStops = stops.filter((x) => x && /iPrint/.test(x.id));
const invisibleFocus = stops.filter((x) => x && x.visible && x.outline.startsWith('none') && (x.boxShadow === 'none'));
console.log('tab stops', stops.map((x) => `${x?.tag}#${x?.id}[${x?.text}] fv=${x?.focusVisible} outline=${x?.outline}`).join('\n'));
L(SC, 'BT-11', 'Estado.aspx (Tab)', 'executed-static', {
  reason: `${stops.length} paradas; iconos PDF alcanzables por Tab: ${printStops.length} (${printStops.map((p) => p.id + ' ' + p.size).join(', ')}); paradas sin indicador visible: ${invisibleFocus.length}`,
  evidence: [stopsEv],
});

// CC-01 copy review (collected; assessed in findings)
L(SC, 'CC-01', 'Estado.aspx', 'executed-static', {
  reason: `Título '${snap.pageTitle}'; cabeceras ${snap.headers.map((h) => h.text).filter(Boolean).join(' / ')}; fechas formato ${snap.rows[0]?.cells[2]}; moneda '${snap.rows[0]?.cells[8]}'`,
  evidence: [snapEv],
});
await s.close();
console.log('done');
