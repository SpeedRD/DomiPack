// Phase 4 — NuevaCuenta.aspx RS-01/02/03 + AX-01/05 per viewport; preloader check; plus two Login extras
// (logo visibility at 375px for LG-14; static log of Recuperar()). Unauthenticated; no POSTs (route backstop).
import { startSession, shot, runAxe, logCase, saveEvidence, BASE_URL } from '../../support/phase4.ts';

const GROUP = 'login';
const SCREEN = 'Nueva Cuenta';
const URL_NC = `${BASE_URL}/NuevaCuenta.aspx`;
const s = await startSession({ name: 'p4-nueva-cuenta-responsive', auth: false });
const page = s.page;
await s.context.route('**/*', (route) => (route.request().method() === 'POST' ? route.abort('blockedbyclient') : route.continue()));

const vps: [string, number, number][] = [['RS-01', 375, 812], ['RS-02', 768, 1024], ['RS-03', 1440, 900]];
const report: any[] = [];
for (const [caseId, w, h] of vps) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(URL_NC, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const m: any = await page.evaluate(`(() => {
    var de = document.documentElement; var cw = de.clientWidth;
    var r = function (sel) { var e = document.querySelector(sel); if (!e) return null; var b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right) }; };
    var off = []; document.querySelectorAll('body *').forEach(function (el) { var b = el.getBoundingClientRect(); if (b.right > cw + 1 && b.width > 0 && getComputedStyle(el).visibility !== 'hidden') off.push({ tag: el.tagName, id: el.id, cls: (el.className || '').toString().slice(0, 40), right: Math.round(b.right), w: Math.round(b.width) }); });
    var pre = document.querySelector('.se-pre-con');
    return { scrollWidth: de.scrollWidth, clientWidth: cw, overflow: de.scrollWidth > cw, htmlOverflowX: getComputedStyle(de).overflowX, offenders: off.slice(0, 8),
      preloader: pre ? { display: getComputedStyle(pre).display, opacity: getComputedStyle(pre).opacity } : null,
      logo: r('#IdHeading img'), panel: r('.panel'), bSend: r('#bSend'), lSucursal: r('#lSucursal'), cbMedio: r('#cbMedioiD'), ckDomicilio: r('#ckDomicilio'), ckRua: r('#ckRua'), email: r('#Email'), fontSize: getComputedStyle(document.getElementById('Nombre')).fontSize, emailPlaceholderClipped: (function () { var e = document.getElementById('Email'); return e.scrollWidth > e.clientWidth; })() };
  })()`);
  const shotPath = await shot(page, `rs-nueva-cuenta-${w}`);
  const axe = await runAxe(page, `nueva-cuenta-${w}`);
  const small = ['ckDomicilio', 'ckRua'].filter((k) => m[k] && m[k].h < 24);
  const rec = { caseId, w, h, ...m, small, axeCount: axe.count, axe: axe.violations.map((v) => `${v.id}(${v.impact},${v.nodes})`), shot: shotPath, axeFile: axe.file };
  report.push(rec);
  console.log('RS', JSON.stringify(rec));
  const fail = m.overflow || small.length > 0 || (m.preloader && m.preloader.display !== 'none' && parseFloat(m.preloader.opacity) > 0.5);
  logCase({ group: GROUP, screen: SCREEN, caseId, instance: `Nueva Cuenta @${w}px`, result: fail ? 'fail' : 'pass', findingIds: fail ? ['NC-16'] : [], reason: `overflow=${m.overflow} (${m.scrollWidth}/${m.clientWidth}, html overflow-x=${m.htmlOverflowX}) offenders=${JSON.stringify(m.offenders.slice(0, 3))} smallTargets=${small.join(',') || 'none'} preloader=${JSON.stringify(m.preloader)} axe=${axe.count}`, evidence: [shotPath, axe.file] });
  if (w === 1440) {
    logCase({ group: GROUP, screen: SCREEN, caseId: 'AX-01', instance: 'Nueva Cuenta', result: axe.count ? 'fail' : 'pass', findingIds: axe.count ? ['NC-17'] : [], reason: rec.axe.join(', '), evidence: [axe.file] });
    const contrast = axe.violations.filter((v) => /contrast/.test(v.id));
    logCase({ group: GROUP, screen: SCREEN, caseId: 'AX-05', instance: 'Nueva Cuenta', result: contrast.length ? 'fail' : 'pass', findingIds: contrast.length ? ['NC-17'] : [], reason: contrast.map((v) => `${v.id}: ${v.sample.join(' ; ')}`).join(' | ') || 'sin violaciones de contraste según axe', evidence: [axe.file] });
  }
}
saveEvidence('nueva-cuenta-responsive', report);

// ---- Login extras ----
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(`${BASE_URL}/Login.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const logo: any = await page.evaluate(`(() => { var i = document.getElementById('imaglogo'); var cs = getComputedStyle(i); var b = i.getBoundingClientRect(); var a = i.closest('a'); var acs = a ? getComputedStyle(a) : null; var h3 = a ? a.parentElement : null; return { display: cs.display, visibility: cs.visibility, opacity: cs.opacity, w: Math.round(b.width), h: Math.round(b.height), complete: i.complete, naturalWidth: i.naturalWidth, aDisplay: acs ? acs.display : null, h3Display: h3 ? getComputedStyle(h3).display : null, h3Class: h3 ? h3.className : null }; })()`);
await page.setViewportSize({ width: 768, height: 1024 });
await page.waitForTimeout(500);
const logo768: any = await page.evaluate(`(() => { var i = document.getElementById('imaglogo'); var b = i.getBoundingClientRect(); return { display: getComputedStyle(i).display, w: Math.round(b.width), h3Display: getComputedStyle(i.closest('a').parentElement).display }; })()`);
saveEvidence('LG-14-logo-375', { at375: logo, at768: logo768 });
console.log('LOGO', JSON.stringify({ logo, logo768 }));
logCase({ group: GROUP, screen: 'Login', caseId: 'RS-01', instance: 'logo @375px', result: logo.display === 'none' || logo.w === 0 ? 'fail' : 'pass', findingIds: logo.display === 'none' || logo.w === 0 ? ['LG-14'] : [], reason: `logo at 375: ${JSON.stringify(logo)}; at 768: ${JSON.stringify(logo768)}` });
logCase({ group: GROUP, screen: 'Login', caseId: 'BT-10', instance: 'Recuperar mi Contraseña? (STATIC, never fired)', result: 'executed-static', findingIds: ['LG-17'], reason: 'Recuperar() = document.getElementById("bRecuperar").click() -> submit oculto -> POST Login.aspx con bRecuperar (envío real de correo). Sin campo/paso propio: usa #lUser (required) y no pide confirmación; con #lUser vacío el navegador bloquea (required). No ejecutado.', evidence: ['audit/logs/evidence/login-inline-scripts.js'] });

await s.close();
console.log('DONE nueva-cuenta-responsive');
