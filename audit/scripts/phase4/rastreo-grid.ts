// Rastreo grid (#cpBody_gvDatos, DevExpress grouped): TB-03/04/05/06/08/12, BT-06, BT-11, AX-03 (grid part).
import { startSession, go, shot, saveEvidence, logCase, serverErrorSignature, visibleText } from '../../support/phase4.ts';

const G = 'rastreo';
const SCREEN = 'Rastreo (grid #cpBody_gvDatos)';
const s = await startSession({ name: 'p4-rastreo-grid' });
const page = s.page;
await s.context.addInitScript('window.__name = window.__name || (function(f){return f;});');
await page.evaluate('window.__name = window.__name || (function(f){return f;});');
if (!/Rastreo\.aspx/i.test(page.url())) await go(page, 'Rastreo.aspx');
await page.waitForLoadState('networkidle').catch(() => {});

const dialogs: string[] = [];
page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()}`); await d.dismiss().catch(() => {}); });
const callbacks: { url: string; status: number; ms: number }[] = [];
const started = new Map<string, number>();
page.on('request', (r) => { if (r.method() === 'POST') started.set(r.url() + '#' + Date.now(), Date.now()); });
page.on('response', (r) => { if (r.request().method() === 'POST') callbacks.push({ url: r.url(), status: r.status(), ms: 0 }); });

const gridState = () => page.evaluate(() => {
  const q = (sel: string) => Array.from(document.querySelectorAll(sel));
  const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
  return {
    groupRows: q('#cpBody_gvDatos tr[id*="DXGroupRow"]').map((r) => ({ id: r.id, visible: vis(r), text: (r as HTMLElement).innerText.trim().slice(0, 80) })),
    dataRows: q('#cpBody_gvDatos tr[id*="DXDataRow"]').map((r) => ({ id: r.id, visible: vis(r), text: (r as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 120) })),
    detailRows: q('#cpBody_gvDatos tr.dxgvAdaptiveDetailRow_Office365, #cpBody_gvDatos tr[class*="AdaptiveDetail"], #cpBody_gvDatos tr[id*="DXADRow"], #cpBody_gvDatos tr[id*="DXDetailRow"]').map((r) => ({ id: r.id, cls: r.className, visible: vis(r), text: (r as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 200) })),
    pager: q('#cpBody_gvDatos .dxgvPagerTopPanel_Office365, #cpBody_gvDatos .dxgvPagerBottomPanel_Office365, #cpBody_gvDatos [class*="dxp-"], #cpBody_gvDatos .dxgvPagerPanel').length,
    filterRow: q('#cpBody_gvDatos tr[id*="DXFilterRow"], #cpBody_gvDatos .dxgvFilterRow_Office365, #cpBody_gvDatos .dxgvSearchPanel_Office365').length,
    headers: q('#cpBody_gvDatos td[id^="cpBody_gvDatos_col"]').map((h) => ({ id: h.id, text: (h as HTMLElement).innerText.trim(), sortImg: !!h.querySelector('img[class*="Sort"], .dxGridView_gvHeaderSortDown_Office365, .dxGridView_gvHeaderSortUp_Office365'), visible: vis(h), cursor: getComputedStyle(h).cursor })),
    tableRole: document.querySelector('#cpBody_gvDatos_DXMainTable')?.getAttribute('role'),
    thCount: q('#cpBody_gvDatos th').length,
    tdHeaderCount: q('#cpBody_gvDatos td.dxgvHeader_Office365').length,
    scopeCount: q('#cpBody_gvDatos [scope]').length,
    ariaOnGrid: Array.from(document.querySelector('#cpBody_gvDatos')?.attributes || []).filter((a) => a.name.startsWith('aria') || a.name === 'role').map((a) => `${a.name}=${a.value}`),
    loadingVisible: q('#cpBody_gvDatos_LP, #cpBody_gvDatos_LD').some(vis),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
});

const base = await gridState();
console.log('BASE', JSON.stringify(base, null, 1));
saveEvidence('rastreo-grid-base', base);

// ---- TB-03 (volume) / TB-04 (filter/pager absence)
logCase({ group: G, screen: SCREEN, caseId: 'TB-03', instance: '#cpBody_gvDatos', result: 'omitted', reason: `test account has ${base.dataRows.length} data row(s) in 1 group; no high-volume account/date range available (pageRowSize=10 in client state, pageCount=1)`, evidence: ['audit/logs/evidence/rastreo-grid-base.json'] });
logCase({ group: G, screen: SCREEN, caseId: 'TB-04', instance: '#cpBody_gvDatos', result: 'executed-static', reason: `pager panels=${base.pager}, filter/search rows=${base.filterRow}; only Historial date modal acts as filter. Re-check with larger account.`, evidence: ['audit/logs/evidence/rastreo-grid-base.json'] });

// ---- TB-05: group collapse/expand (mouse), then keyboard. First run showed the collapse callback empties the grid.
const tb05: any = {};
try {
  const grp = page.locator('#cpBody_gvDatos tr[id*="DXGroupRow"] img[onclick*="GVCollapseRow"]').first();
  tb05.imgBefore = await grp.evaluate((i) => ({ cls: i.className, onclick: i.getAttribute('onclick'), alt: i.getAttribute('alt'), title: i.getAttribute('title'), role: i.getAttribute('role'), tabindex: i.getAttribute('tabindex'), ariaLabel: i.getAttribute('aria-label') }));
  let nCb = callbacks.length;
  await grp.click();
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle').catch(() => {});
  tb05.afterCollapse = await gridState();
  tb05.afterCollapseEmptyRow = await page.locator('#cpBody_gvDatos tr[id*="DXEmptyRow"]').innerText().catch(() => null);
  tb05.collapseCallbacks = callbacks.length - nCb;
  tb05.collapsedShot = await shot(page, 'rastreo-grid-collapsed');
  const expandImg = page.locator('#cpBody_gvDatos tr[id*="DXGroupRow"] img[onclick*="GVExpandRow"]');
  tb05.expandImgCount = await expandImg.count();
  if (tb05.expandImgCount > 0) {
    nCb = callbacks.length;
    await expandImg.first().click();
    await page.waitForTimeout(2500);
    tb05.afterExpand = await gridState();
    tb05.expandCallbacks = callbacks.length - nCb;
  }
  // reload to get data back, then test the Tab reachability of the group toggle
  await go(page, 'Rastreo.aspx');
  await page.waitForLoadState('networkidle').catch(() => {});
  tb05.afterReload = (await gridState()).dataRows.length;
  const focusPath: string[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press('Tab');
  for (let i = 0; i < 70; i++) {
    const a = await page.evaluate(() => { const e = document.activeElement as HTMLElement; return e ? `${e.tagName}#${e.id}.${(e.className || '').toString().slice(0, 40)}|${(e.innerText || e.getAttribute('alt') || '').trim().slice(0, 30)}|inGrid=${!!e.closest('#cpBody_gvDatos')}` : 'null'; });
    focusPath.push(a);
    if (a.startsWith('BODY') && i > 5) break;
    await page.keyboard.press('Tab');
  }
  tb05.focusPath = focusPath;
  tb05.gridFocusables = focusPath.filter((f) => f.includes('inGrid=true'));
  tb05.groupToggleFocusable = focusPath.some((f) => /GVCollapseRow|gvExpandedButton|gvCollapsedButton|DXGroupRow/.test(f));
} catch (e: any) { tb05.error = e.message.split('\n')[0]; }
console.log('TB-05', JSON.stringify(tb05, null, 1));
saveEvidence('rastreo-TB-05-groups', tb05);
const collapseEmptied = tb05.afterCollapse && tb05.afterCollapse.dataRows.length === 0 && tb05.afterCollapse.groupRows.length === 0;
const tb05Findings: string[] = [];
if (collapseEmptied) tb05Findings.push('RA-09');
if (tb05.groupToggleFocusable === false) tb05Findings.push('RA-05');
logCase({ group: G, screen: SCREEN, caseId: 'TB-05', instance: 'group row Estatus: Embarcado (ASPx.GVCollapseRow img)', result: tb05Findings.length || tb05.error ? 'fail' : 'pass', findingIds: tb05Findings, reason: `collapse callback emptied grid=${collapseEmptied} (emptyRow="${tb05.afterCollapseEmptyRow}", callbacks=${tb05.collapseCallbacks}); expand toggle present after collapse=${tb05.expandImgCount}; toggle reachable by Tab=${tb05.groupToggleFocusable}; grid focusables=${tb05.gridFocusables?.length}; err=${tb05.error}`, evidence: ['audit/logs/evidence/rastreo-TB-05-groups.json', 'audit/screenshots/rastreo-grid-collapsed.png'] });

// ---- TB-06: row detail expander (DXCBtn1, class dxgvADSB = adaptive detail button)
const tb06: any = {};
try {
  const adsb = page.locator('#cpBody_gvDatos a.dxgvADSB').first();
  tb06.btn = await adsb.evaluate((a) => ({ id: a.id, cls: a.className, title: a.getAttribute('title'), ariaLabel: a.getAttribute('aria-label'), text: a.textContent?.trim(), innerHTML: a.innerHTML.slice(0, 300), href: a.getAttribute('href') }));
  tb06.viewportWidth = await page.evaluate(() => window.innerWidth);
  tb06.hiddenColumnsAt1440 = base.headers.filter((h) => !h.visible).map((h) => h.text);
  let nCb = callbacks.length;
  await adsb.click();
  await page.waitForTimeout(2000);
  tb06.afterOpen = await gridState();
  tb06.openCallbacks = callbacks.length - nCb;
  tb06.detailShot = await shot(page, 'rastreo-grid-row-detail-open');
  await adsb.click();
  await page.waitForTimeout(1500);
  tb06.afterClose = await gridState();
  tb06.serverErr = serverErrorSignature(await page.content().catch(() => ''));
  tb06.dialogs = dialogs.splice(0);
} catch (e: any) { tb06.error = e.message.split('\n')[0]; }
console.log('TB-06', JSON.stringify(tb06, null, 1));
saveEvidence('rastreo-TB-06-detail', tb06);
const detailShown = tb06.afterOpen?.detailRows?.some((r: any) => r.visible && r.text);
const detailEmptied = tb06.afterOpen && tb06.afterOpen.dataRows.length === 0;
logCase({ group: G, screen: SCREEN, caseId: 'TB-06', instance: '#cpBody_gvDatos_DXCBtn1 (dxgvADSB "...")', result: tb06.serverErr || tb06.error || detailEmptied ? 'fail' : detailShown ? 'pass' : 'fail', findingIds: detailEmptied ? ['RA-09'] : [], reason: `detail visible after click=${detailShown} callbacks=${tb06.openCallbacks} gridEmptied=${detailEmptied} detailText=${JSON.stringify(tb06.afterOpen?.detailRows?.filter((r: any) => r.visible).map((r: any) => r.text))} hidden cols at 1440=${JSON.stringify(tb06.hiddenColumnsAt1440)} err=${tb06.error}`, evidence: ['audit/logs/evidence/rastreo-TB-06-detail.json', 'audit/screenshots/rastreo-grid-row-detail-open.png'] });
if (detailEmptied || tb06.afterOpen?.dataRows?.length === 0) { await go(page, 'Rastreo.aspx'); await page.waitForLoadState('networkidle').catch(() => {}); }

// ---- TB-08: table semantics
logCase({ group: G, screen: SCREEN, caseId: 'TB-08', instance: '#cpBody_gvDatos', result: base.thCount === 0 ? 'fail' : 'pass', findingIds: base.thCount === 0 ? ['RA-06'] : [], reason: `th=${base.thCount} td.dxgvHeader=${base.tdHeaderCount} scope attrs=${base.scopeCount} role=${base.tableRole} aria on grid=${JSON.stringify(base.ariaOnGrid)}`, evidence: ['audit/logs/evidence/rastreo-grid-base.json'] });

// ---- BT-06 / AX-03: icon-only per-row buttons and group toggle accessible names
const names = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('#cpBody_gvDatos a, #cpBody_gvDatos img[onclick], #cpBody_gvDatos img, #cpBody_bpagar, .app-page-title a, .app-page-title button'));
  return els.map((e) => {
    const h = e as HTMLElement;
    const img = e.tagName === 'IMG' ? (e as HTMLImageElement) : e.querySelector('img');
    return { tag: e.tagName, id: e.id, cls: (e.className || '').toString().slice(0, 60), text: (h.innerText || '').trim().slice(0, 40), ariaLabel: e.getAttribute('aria-label'), title: e.getAttribute('title'), role: e.getAttribute('role'), imgAlt: img?.getAttribute('alt'), imgSrc: img?.getAttribute('src')?.slice(0, 80), href: e.getAttribute('href'), visible: h.offsetParent !== null, tabindex: e.getAttribute('tabindex'), accessibleName: (e as any).ariaLabel || (h.innerText || '').trim() || img?.getAttribute('alt') || e.getAttribute('title') || '' };
  }).filter((x) => x.visible);
});
console.log('BT-06 names', JSON.stringify(names, null, 1));
saveEvidence('rastreo-BT-06-names', names);
const unnamed = names.filter((n) => !n.accessibleName);
logCase({ group: G, screen: SCREEN, caseId: 'BT-06', instance: 'per-row icons (DXCBtn0 Post-Alerta, DXCBtn1 "...", group toggle img, Adjuntos "0" link)', result: unnamed.length ? 'fail' : 'pass', findingIds: unnamed.length ? ['RA-07'] : [], reason: `unnamed visible controls: ${JSON.stringify(unnamed.map((u) => `${u.tag}#${u.id}.${u.cls.slice(0, 25)}`))}`, evidence: ['audit/logs/evidence/rastreo-BT-06-names.json'] });
logCase({ group: G, screen: SCREEN, caseId: 'AX-03', instance: 'grid icon-only controls', result: unnamed.length ? 'fail' : 'pass', findingIds: unnamed.length ? ['RA-07'] : [], reason: `${unnamed.length} unnamed of ${names.length} visible controls`, evidence: ['audit/logs/evidence/rastreo-BT-06-names.json'] });

// ---- BT-11: focus-visible on buttons/links in the page (focus ring check)
const focusRing: any[] = [];
for (const sel of ['#cpBody_bpagar', 'a[onclick*="VerGuia"]', 'a[href*="Adjuntos.aspx"]', '#cpBody_gvDatos_DXCBtn0', '#cpBody_gvDatos_DXCBtn1', '#lRastreo']) {
  const r = await page.evaluate((sel) => {
    const e = document.querySelector(sel) as HTMLElement | null;
    if (!e) return { sel, missing: true };
    const before = getComputedStyle(e);
    const b = { outline: before.outlineStyle + ' ' + before.outlineWidth + ' ' + before.outlineColor, boxShadow: before.boxShadow, bg: before.backgroundColor };
    e.focus();
    const after = getComputedStyle(e);
    const a = { outline: after.outlineStyle + ' ' + after.outlineWidth + ' ' + after.outlineColor, boxShadow: after.boxShadow, bg: after.backgroundColor, focused: document.activeElement === e, tabIndex: e.tabIndex };
    return { sel, before: b, after: a, changed: JSON.stringify(b) !== JSON.stringify({ outline: a.outline, boxShadow: a.boxShadow, bg: a.bg }) };
  }, sel);
  focusRing.push(r);
}
console.log('BT-11', JSON.stringify(focusRing, null, 1));
saveEvidence('rastreo-BT-11-focus', focusRing);
const noRing = focusRing.filter((f) => !f.missing && f.after?.focused && !f.changed);
logCase({ group: G, screen: SCREEN, caseId: 'BT-11', instance: 'Menu, tracking link, Adjuntos link, DXCBtn0/1, sidebar Rastreo', result: noRing.length ? 'fail' : 'pass', findingIds: noRing.length ? ['RA-08'] : [], reason: `focused-without-visible-change: ${JSON.stringify(noRing.map((f) => f.sel))}; not focusable: ${JSON.stringify(focusRing.filter((f) => !f.missing && !f.after?.focused).map((f) => f.sel))}`, evidence: ['audit/logs/evidence/rastreo-BT-11-focus.json'] });

// ---- Post-Alerta command button DXCBtn0: what is it? (icon in command column) — inspect + click (read action?)
const cbtn0 = await page.evaluate(() => { const a = document.getElementById('cpBody_gvDatos_DXCBtn0'); return a ? { html: a.outerHTML.slice(0, 500), parentHeader: 'Post-Alerta' } : null; });
console.log('DXCBtn0', JSON.stringify(cbtn0));
saveEvidence('rastreo-DXCBtn0', cbtn0);

// ---- TB-12: header sorting (runs LAST: first run showed the grid going to "No data to display" after a sort)
const cbBodies: { url: string; status: number; param: string; bodyHead: string; size: number }[] = [];
page.on('response', async (r) => {
  const req = r.request();
  if (req.method() === 'POST' && /Rastreo\.aspx/i.test(r.url()) && /__CALLBACKID/.test(req.postData() || '')) {
    const pd = req.postData() || '';
    const m = pd.match(/__CALLBACKPARAM=([^&]*)/);
    const body = await r.text().catch(() => '');
    cbBodies.push({ url: r.url(), status: r.status(), param: decodeURIComponent(m?.[1] || '').slice(0, 300), bodyHead: body.slice(0, 600), size: body.length });
  }
});
const sortResults: any[] = [];
const fresh = await gridState();
sortResults.push({ step: 'fresh', rows: fresh.dataRows.length, groups: fresh.groupRows.length });
for (const [i, h] of base.headers.filter((h) => h.visible && !/Post-Alerta/.test(h.text)).slice(0, 2).entries()) {
  const nBefore = callbacks.length;
  await page.click(`#${h.id}`).catch((e) => sortResults.push({ header: h.text, err: e.message.split('\n')[0] }));
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle').catch(() => {});
  const after = await gridState();
  sortResults.push({ step: `click header ${h.text}`, callbacksFired: callbacks.length - nBefore, sortImgAfter: after.headers.find((x) => x.id === h.id)?.sortImg, rowsAfter: after.dataRows.length, groupsAfter: after.groupRows.length, emptyRowText: await page.locator('#cpBody_gvDatos tr[id*="DXEmptyRow"]').innerText().catch(() => null), serverErr: serverErrorSignature(await page.content()), dialogs: dialogs.splice(0) });
  if (i === 0) {
    await shot(page, 'RA-09');
    // click same header again (toggle desc) — does data come back?
    await page.click(`#${h.id}`).catch(() => {});
    await page.waitForTimeout(2500);
    const again = await gridState();
    sortResults.push({ step: `click header ${h.text} again`, rowsAfter: again.dataRows.length, groupsAfter: again.groupRows.length, sortImg: again.headers.find((x) => x.id === h.id)?.sortImg });
  }
}
// reload: is the empty state sticky?
await go(page, 'Rastreo.aspx');
await page.waitForLoadState('networkidle').catch(() => {});
const afterReload = await gridState();
sortResults.push({ step: 'after reload Rastreo.aspx', rows: afterReload.dataRows.length, groups: afterReload.groupRows.length, sortImgs: afterReload.headers.filter((h) => h.sortImg).map((h) => h.text) });
const reloadShot = await shot(page, 'rastreo-grid-after-sort-reload');
// fresh session check: open a new page in the same context
const p2 = await s.newPage('sort-newpage');
await p2.goto(page.url(), { waitUntil: 'networkidle' }).catch(() => {});
const newPageRows = await p2.locator('#cpBody_gvDatos tr[id*="DXDataRow"]').count().catch(() => -1);
sortResults.push({ step: 'new page same context', rows: newPageRows });
await p2.close();
console.log('TB-12', JSON.stringify(sortResults, null, 1));
saveEvidence('rastreo-TB-12-sort', { sortResults, cbBodies });
const emptied = sortResults.some((r) => r.step?.startsWith('click header') && r.rowsAfter === 0);
logCase({ group: G, screen: SCREEN, caseId: 'TB-12', instance: '#cpBody_gvDatos headers (AD, Guia)', result: emptied ? 'fail' : 'pass', findingIds: emptied ? ['RA-09'] : [], reason: `sort click empties grid=${emptied}; steps=${JSON.stringify(sortResults.map((r) => `${r.step}:${r.rowsAfter ?? r.rows}`))}`, evidence: ['audit/logs/evidence/rastreo-TB-12-sort.json', 'audit/screenshots/RA-09.png', reloadShot] });

saveEvidence('rastreo-grid-callbacks', callbacks);
console.log('dialogs', dialogs);
await s.close();
console.log('done');
