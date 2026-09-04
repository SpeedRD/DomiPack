// RS-01..04 + AX-01/03/05 (+TB-07) for Estado, Prueba, PreAlerta, PagoOnline.
// ORDER MATTERS: PagoOnline answers 500 once Estado.aspx has been visited in the session (PO-01),
// so PagoOnline is captured first and Estado last.
import { startSession, go, shot, saveEvidence, runAxe, serverErrorSignature } from '../../support/phase4.ts';
import { shimName, L, SCREEN, overflowInfo } from './docs-common.ts';

const s = await startSession({ name: 'p4-docs-responsive' });
const page = s.page;
await shimName(page);

const screens: Array<{ slug: string; rel: string; name: string; ids: string }> = [
  { slug: 'pagoonline', rel: 'PagoOnline.aspx', name: SCREEN.pago, ids: 'PO' },
  { slug: 'prueba', rel: 'PruebaExportacion.aspx', name: SCREEN.prueba, ids: 'PE' },
  { slug: 'prealerta', rel: 'PreAlerta.aspx', name: SCREEN.prealerta, ids: 'PA' },
  { slug: 'estado', rel: 'Estado.aspx', name: SCREEN.estado, ids: 'EC' },
];
const VPS = [
  { w: 375, h: 812, id: 'RS-01' },
  { w: 768, h: 1024, id: 'RS-02' },
  { w: 1440, h: 900, id: 'RS-03' },
];
const all: any = {};
for (const sc of screens) {
  all[sc.slug] = {};
  for (const vp of VPS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await go(page, sc.rel);
    await page.waitForLoadState('networkidle').catch(() => {});
    const html = await page.content();
    const err = serverErrorSignature(html);
    if (err) {
      L(sc.name, vp.id, `${sc.rel} @${vp.w}`, 'omitted', { reason: `Servidor devolvió '${err}' en esta carga (PO-01)`, findingIds: ['PO-01'] });
      all[sc.slug][vp.w] = { error: err };
      continue;
    }
    const info = await overflowInfo(page);
    // tap-target sizes of interactive controls in the main content
    const taps = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.app-main a, .app-main button, .app-main input:not([type=hidden]), .app-main select, .app-main textarea, .app-header a, .app-header button'))
        .filter((e) => (e as HTMLElement).offsetParent !== null);
      const small = els
        .map((e) => { const r = (e as HTMLElement).getBoundingClientRect(); return { sel: `${e.tagName.toLowerCase()}#${e.id}`, w: Math.round(r.width), h: Math.round(r.height), text: (e.textContent || '').trim().slice(0, 20) }; })
        .filter((x) => x.w > 0 && x.h > 0 && (x.w < 24 || x.h < 24));
      return { total: els.length, small };
    });
    // Does the grid overflow its card? (TB-07 / RS-04)
    const gridBox = await page.evaluate(() => {
      const g = document.querySelector('#cpBody_gvDatos') as HTMLElement | null;
      const card = g?.closest('.panel, .card, .card-body, .panel-body') as HTMLElement | null;
      const form = document.querySelector('.app-main__inner') as HTMLElement | null;
      return g
        ? { gridRight: Math.round(g.getBoundingClientRect().right), cardRight: card ? Math.round(card.getBoundingClientRect().right) : null, mainRight: form ? Math.round(form.getBoundingClientRect().right) : null, gridW: Math.round(g.getBoundingClientRect().width), viewport: document.documentElement.clientWidth, cellsHidden: g.querySelectorAll('td.dxgvAIC').length, visibleHeaders: Array.from(g.querySelectorAll('td[class*=dxgvHeader]')).filter((h) => (h as HTMLElement).offsetParent !== null && (h as HTMLElement).getBoundingClientRect().width > 0).map((h) => h.textContent?.trim()).filter(Boolean) }
        : null;
    });
    const form375 = sc.slug === 'prealerta' ? await page.evaluate(() => {
      const ids = ['cpBody_Tracking', 'cpBody_FOB', 'cpBody_Transpos', 'cpBody_Suplidor', 'cpBody_contenido', 'cpBody_File1', 'cpBody_bSend'];
      return ids.map((id) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r ? `${id}:${Math.round(r.left)}-${Math.round(r.right)}` : id + ':missing'; });
    }) : null;
    const shotP = await shot(page, `rs-${sc.slug}-${vp.w}`);
    const rec = { ...info, taps, gridBox, form375, shot: shotP };
    all[sc.slug][vp.w] = rec;
    console.log(`${sc.slug}@${vp.w}: overflow=${info.overflow} (sw=${info.scrollWidth}/cw=${info.clientWidth}) gridRight=${gridBox?.gridRight} cardRight=${gridBox?.cardRight} hiddenCells=${gridBox?.cellsHidden} scrollContainer=${info.gridScrollContainer} sidebar=${info.sidebarVisible} toggle=${info.mobileToggle} small=${taps.small.length} wide=${info.wideElements.join(',')}`);
    const gridOverflowsCard = gridBox && gridBox.cardRight !== null && gridBox.gridRight > gridBox.cardRight + 2;
    const fail = info.overflow || gridOverflowsCard;
    L(sc.name, vp.id, `${sc.rel} @${vp.w}`, fail ? 'fail' : 'pass', {
      findingIds: fail ? [`${sc.ids}-RS`] : [],
      reason: `overflow doc=${info.overflow} (scrollW ${info.scrollWidth} vs ${info.clientWidth}); grid ancho=${gridBox?.gridW} right=${gridBox?.gridRight} card right=${gridBox?.cardRight}; celdas adaptativas ocultas=${gridBox?.cellsHidden}; sidebar visible=${info.sidebarVisible} toggle móvil=${info.mobileToggle}; controles <24px: ${taps.small.length}`,
      evidence: [shotP],
    });
    if (vp.w !== 1440 && gridBox) {
      L(sc.name, 'TB-07', `#cpBody_gvDatos @${vp.w}`, fail ? 'fail' : 'pass', {
        findingIds: fail ? [`${sc.ids}-RS`] : [],
        reason: `contenedor scroll propio=${info.gridScrollContainer ?? 'ninguno'}; modo adaptativo DevExpress oculta ${gridBox.cellsHidden} celdas; cabeceras visibles: ${gridBox.visibleHeaders.join('/')}`,
        evidence: [shotP],
      });
      L(sc.name, 'RS-04', `#cpBody_gvDatos @${vp.w}`, fail ? 'fail' : 'pass', { findingIds: fail ? [`${sc.ids}-RS`] : [], reason: `Ver TB-07/RS-0x @${vp.w}`, evidence: [shotP] });
    }
    // RS-05 is owned by the shared-chrome group; only record observation on mobile toggle presence
  }
  // AX-01 / AX-03 / AX-05 at 1440 (last viewport loaded)
  if (!all[sc.slug][1440]?.error) {
    const axe = await runAxe(page, sc.slug);
    const contrast = axe.violations.find((v) => v.id === 'color-contrast');
    const names = axe.violations.filter((v) => /name|label|link-name|button-name|image-alt/.test(v.id));
    const tables = axe.violations.filter((v) => /table|th-has|td-headers|scope/.test(v.id));
    console.log(`axe ${sc.slug}: ${axe.count} violations: ${axe.violations.map((v) => `${v.id}(${v.impact},${v.nodes})`).join(', ')}`);
    L(sc.name, 'AX-01', sc.rel, axe.count ? 'fail' : 'pass', { findingIds: axe.count ? [`${sc.ids}-AX`] : [], reason: `${axe.count} reglas violadas: ${axe.violations.map((v) => `${v.id}(${v.impact}×${v.nodes})`).join(', ')}`, evidence: [axe.file] });
    L(sc.name, 'AX-03', sc.rel + ' (controles sólo icono)', names.length ? 'fail' : 'pass', { findingIds: names.length ? [`${sc.ids}-AX`] : [], reason: names.length ? names.map((v) => `${v.id}: ${v.sample.join(' ; ')}`).join(' | ') : 'axe no reporta controles sin nombre', evidence: [axe.file] });
    L(sc.name, 'AX-05', sc.rel + ' (contraste)', contrast ? 'fail' : 'pass', { findingIds: contrast ? [`${sc.ids}-AX`] : [], reason: contrast ? `color-contrast ${contrast.impact} ×${contrast.nodes}: ${contrast.sample.join(' ; ')}` : 'sin violaciones de contraste según axe', evidence: [axe.file] });
    all[sc.slug].axe = axe;
    // mobile axe as extra evidence
    await page.setViewportSize({ width: 375, height: 812 });
    await go(page, sc.rel);
    if (!serverErrorSignature(await page.content())) {
      const axeM = await runAxe(page, `${sc.slug}-375`);
      all[sc.slug].axe375 = axeM;
      console.log(`axe ${sc.slug}@375: ${axeM.count}: ${axeM.violations.map((v) => `${v.id}(${v.nodes})`).join(', ')}`);
    }
  } else {
    for (const c of ['AX-01', 'AX-03', 'AX-05']) L(sc.name, c, sc.rel, 'omitted', { reason: 'Página con error 500 en esta sesión (PO-01)', findingIds: ['PO-01'] });
  }
}
saveEvidence('docs-responsive-summary', all);
await s.close();
console.log('done');
