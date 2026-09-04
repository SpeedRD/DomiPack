// PagoOnline.aspx — observational only. The page answers HTTP 500 intermittently (recon), so:
//  1) GET it; on the first healthy (200) response run the DOM-only cases right there
//     (TB-11, TB-09, BT-09, TB-08, CC-01, AX-04). Never click #cpBody_bpagar / #cpBody_bCheckOut /
//     #SetCliente / grid rows.
//  2) Characterize the 500 with a navigation sequence (statuses only) → PO-01 evidence.
import { startSession, go, shot, saveEvidence, saveText, serverErrorSignature, BASE_URL } from '../../support/phase4.ts';
import { shimName, L, SCREEN, tabTraverse } from './docs-common.ts';

const s = await startSession({ name: 'p4-docs-pagoonline' });
const page = s.page;
await shimName(page);
const SC = SCREEN.pago;

async function getPago(label: string) {
  const resp = await page.goto(`${BASE_URL}/PagoOnline.aspx`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const html = await page.content();
  const rec = { label, status: resp?.status(), title: await page.title(), sig: serverErrorSignature(html), url: page.url(), ts: new Date().toISOString() };
  console.log(`GET PagoOnline [${label}] -> ${rec.status} '${rec.title}' sig=${rec.sig}`);
  return rec;
}

const seq: any[] = [];
let domDone = false;
let healthyShot = '';
let errorShot = '';
let errorHtml = '';

async function domCases() {
  const dom = await page.evaluate(() => {
    const g = document.querySelector('#cpBody_gvDatos');
    const rows = Array.from(document.querySelectorAll('#cpBody_gvDatos tr[id*="DXDataRow"]')).map((r) => ({
      id: r.id,
      cls: r.className,
      selected: /SelectedRow/.test(r.className),
      cells: Array.from(r.querySelectorAll(':scope > td')).map((c) => c.textContent?.replace(/<!--[\s\S]*?-->/g, '').trim().slice(0, 60)),
    }));
    const footer = Array.from(document.querySelectorAll('#cpBody_gvDatos tr[id*="DXFooterRow"] td')).map((c) => c.textContent?.trim());
    const headers = Array.from(document.querySelectorAll('#cpBody_gvDatos td[class*="dxgvHeader"]')).map((h) => h.textContent?.trim());
    const bpagar = document.querySelector('#cpBody_bpagar') as HTMLElement | null;
    const dd = bpagar?.closest('.dropdown, .btn-group, .page-title-actions') || bpagar?.parentElement;
    const menu = dd?.querySelector('.dropdown-menu');
    const hidden = ['#cpBody_ClienteID', '#cpBody_Guia', '#cpBody_sRecoger', '#cpBody_sdelivery', '#cpBody_Direcciones', '#cpBody_nota', '#cpBody_tbProvincia', '#cpBody_tbSectores', '#cpBody_TokenID', '#cpBody_bCheckOut', '#lsClienteID', '#SetCliente'].map((sel) => {
      const el = document.querySelector(sel) as HTMLInputElement | null;
      return { sel, present: !!el, visible: el ? el.offsetParent !== null : null, value: el?.value?.slice(0, 40), disabled: el?.disabled, onclick: el?.getAttribute('onclick'), checked: el?.type === 'radio' ? el.checked : undefined };
    });
    const allScripts = Array.from(document.querySelectorAll('script')).map((x) => x.textContent || '').join('\n');
    const scripts = Array.from(document.querySelectorAll('script')).filter((sc) => !sc.src).map((sc) => sc.textContent || '').filter((t) => !/^\s*(<!--)?\s*ASPx\./.test(t) && !/__doPostBack|callBackFrameUrl/.test(t));
    return {
      title: document.title,
      headers,
      rows,
      footer,
      ths: g ? g.querySelectorAll('th').length : null,
      role: g?.getAttribute('role'),
      bpagar: bpagar ? { text: bpagar.textContent?.trim(), attrs: Array.from(bpagar.attributes).map((a) => `${a.name}=${a.value}`), disabled: (bpagar as HTMLButtonElement).disabled, parentHtml: dd?.outerHTML.slice(0, 1200) } : null,
      dropdownMenu: menu ? { html: menu.outerHTML.slice(0, 800), children: menu.children.length, visible: (menu as HTMLElement).offsetParent !== null } : null,
      hidden,
      scripts: scripts.map((t) => t.slice(0, 4000)),
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 2000),
      allowSelectByItemClick: (allScripts.match(/'allowSelectByItemClick':(true|false)/) || [])[1],
      selectionState: (allScripts.match(/'selection':'([^']*)'/) || [])[1],
      selectedRowCount: (allScripts.match(/'selectedWithoutPageRowCount':(\d+)/) || [])[1],
      forms: Array.from(document.querySelectorAll('form')).map((f) => ({ id: f.id, action: f.getAttribute('action'), onsubmit: f.getAttribute('onsubmit') })),
    };
  });
  const domEv = saveEvidence('pagoonline-dom', dom);
  healthyShot = await shot(page, 'pagoonline-1440');
  console.log(JSON.stringify({ headers: dom.headers, rows: dom.rows, footer: dom.footer, bpagar: dom.bpagar, dropdown: dom.dropdownMenu, hidden: dom.hidden, sel: dom.allowSelectByItemClick, selState: dom.selectionState, selCount: dom.selectedRowCount, scripts: dom.scripts.map((x) => x.slice(0, 600)) }, null, 1));

  const preSel = dom.rows.filter((r) => r.selected);
  L(SC, 'TB-11', '#cpBody_gvDatos fila preseleccionada', 'executed-static', {
    reason: `${dom.rows.length} fila(s), ${preSel.length} con clase dxgvSelectedRow; allowSelectByItemClick=${dom.allowSelectByItemClick}; selectedWithoutPageRowCount=${dom.selectedRowCount}; footer=${JSON.stringify(dom.footer)}; sin clic en filas`,
    findingIds: ['PO-02'],
    evidence: [domEv, healthyShot],
  });
  const totals = dom.rows.map((r) => parseFloat((r.cells[r.cells.length - 2] || '0').replace(/,/g, '')));
  L(SC, 'TB-09', '#cpBody_gvDatos_DXFooterRow', 'fail', {
    findingIds: ['PO-02'],
    reason: `Footer ${JSON.stringify(dom.footer.filter(Boolean))}; suma 'Total A Pagar' filas visibles=${totals.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)}; formato 'DOP$: 0.000' (3 decimales, sin etiqueta de qué totaliza)`,
    evidence: [domEv, healthyShot],
  });
  L(SC, 'BT-09', '#cpBody_bpagar', 'executed-static', {
    reason: `attrs=${JSON.stringify(dom.bpagar?.attrs)}; dropdown-menu presente=${!!dom.dropdownMenu} hijos=${dom.dropdownMenu?.children ?? 'n/a'}; sin clic`,
    findingIds: ['PO-03'],
    evidence: [domEv],
  });
  L(SC, 'TB-08', '#cpBody_gvDatos', dom.ths === 0 ? 'fail' : 'pass', {
    findingIds: dom.ths === 0 ? ['EC-02'] : [],
    reason: `th=${dom.ths} role=${dom.role}; cabeceras en <td class=dxgvHeader_Moderno> (mismo patrón que Estado, EC-02)`,
    evidence: [domEv],
  });
  L(SC, 'CC-01', 'PagoOnline.aspx', 'executed-static', { reason: `Textos: ${dom.bodyText.slice(0, 500)}`, evidence: [domEv] });
  const stops = await tabTraverse(page, 30);
  const tabEv = saveEvidence('pagoonline-tab-order', stops);
  L(SC, 'AX-04', 'PagoOnline.aspx', 'executed-static', { reason: `${stops.length} paradas de Tab: ${stops.map((x) => `${x?.tag}#${x?.id}`).join(' > ')}`, evidence: [tabEv] });
  domDone = true;
}

// 1) First GET → if healthy, run DOM cases on it.
seq.push(await getPago('fresh session, straight after login'));
if (seq[0].status === 200 && !seq[0].sig) await domCases();

// 2) Sequence to characterize the intermittent 500 (status only). Pattern from recon:
//    Estado→Prueba→PreAlerta→Pago = 500; login→Pago = 200; Pago→Estado→Pago = 500.
seq.push(await getPago('2nd consecutive GET'));
if (!domDone && seq[seq.length - 1].status === 200 && !seq[seq.length - 1].sig) await domCases();
for (const via of ['Rastreo.aspx', 'PruebaExportacion.aspx', 'PreAlerta.aspx', 'Estado.aspx', 'MiCuenta.aspx']) {
  await go(page, via);
  const r = await getPago(`after visiting ${via}`);
  seq.push(r);
  if (!domDone && r.status === 200 && !r.sig) await domCases();
  if (r.status >= 400 && !errorShot) {
    errorShot = await shot(page, 'PO-01');
    errorHtml = saveText('PO-01-response', await page.content(), 'html');
  }
}
seq.push(await getPago('consecutive GET after previous'));
await page.waitForTimeout(10000);
seq.push(await getPago('after 10s idle'));

const sidebar = await (async () => {
  await go(page, 'Estado.aspx');
  return page.evaluate(() => {
    const a = document.querySelector('a[href="PagoOnline.aspx"]') as HTMLElement | null;
    const li = a?.closest('li') as HTMLElement | null;
    return a ? { href: a.getAttribute('href'), text: a.textContent?.trim(), liDisplay: li ? getComputedStyle(li).display : null, liStyleAttr: li?.getAttribute('style'), aVisible: a.offsetParent !== null } : null;
  });
})();
const ev = saveEvidence('PO-01-attempts', { sequence: seq, sidebar });
const n500 = seq.filter((x) => x.status >= 500).length;
console.log(`summary: ${n500}/${seq.length} GETs -> 500; sidebar=${JSON.stringify(sidebar)}`);

L(SC, 'NV-06', 'PagoOnline.aspx (direct URL, sidebar <li> display:none)', n500 ? 'fail' : 'pass', {
  findingIds: n500 ? ['PO-01'] : [],
  reason: `Alcanzable por URL autenticada (link oculto: li display=${sidebar?.liDisplay}); ${n500}/${seq.length} GETs devolvieron HTTP 500 'Runtime Error' (página amarilla ASP.NET)`,
  evidence: [ev, errorShot, errorHtml].filter(Boolean),
});
if (!domDone) {
  for (const [c, inst] of [
    ['TB-11', '#cpBody_gvDatos fila preseleccionada'],
    ['TB-09', '#cpBody_gvDatos_DXFooterRow (DOP$: 0.000)'],
    ['BT-09', '#cpBody_bpagar (Pagar Con)'],
    ['TB-08', '#cpBody_gvDatos'],
    ['CC-01', 'PagoOnline.aspx'],
    ['AX-04', 'PagoOnline.aspx'],
  ]) {
    L(SC, c, inst, 'omitted', { reason: 'La pantalla respondió HTTP 500 en todos los GET de esta sesión; sin DOM que inspeccionar (PO-01)', findingIds: ['PO-01'] });
  }
}
await s.close();
console.log('done');
