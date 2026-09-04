// Phase 4 — Login.aspx: RS-01/02/03 at 375/768/1440 (+ axe per viewport, overflow check, swal overflow after failed login).
import { startSession, shot, runAxe, logCase, saveEvidence, BASE_URL } from '../../support/phase4.ts';

const GROUP = 'login';
const SCREEN = 'Login';
const LOGIN = `${BASE_URL}/Login.aspx`;
const s = await startSession({ name: 'p4-login-responsive', auth: false });
const page = s.page;

const vps: [string, number, number][] = [['RS-01', 375, 812], ['RS-02', 768, 1024], ['RS-03', 1440, 900]];
const report: any[] = [];
for (const [caseId, w, h] of vps) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const m: any = await page.evaluate(`(() => {
    var de = document.documentElement;
    var r = function (sel) { var e = document.querySelector(sel); if (!e) return null; var b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflow: de.scrollWidth > de.clientWidth, bodyScrollWidth: document.body.scrollWidth,
      card: r('.wrapper-page'), lUser: r('#lUser'), lPass: r('#lPass'), entrar: r('a[onclick="login()"]'), recuperar: r('a[onclick="Recuperar();"]'), crear: r('a[href="NuevaCuenta.aspx"]'), checkbox: r('#checkbox-signup'), checkboxLabel: r('label[for="checkbox-signup"]'),
      fontSizeInput: getComputedStyle(document.getElementById('lUser')).fontSize };
  })()`);
  const shotPath = await shot(page, `rs-login-${w}`);
  const axe = await runAxe(page, `login-${w}`);
  const tapSmall = ['recuperar', 'crear', 'checkbox'].filter((k) => m[k] && (m[k].h < 24));
  const rec = { caseId, w, h, ...m, tapSmall, axeCount: axe.count, axeIds: axe.violations.map((v) => v.id), shot: shotPath };
  report.push(rec);
  console.log('RS', JSON.stringify(rec));
  // after a failed login, the swal dialog: check overflow at this width
  await page.fill('#lUser', 'ZZ-000000'); await page.fill('#lPass', 'x');
  await Promise.all([page.waitForResponse((r) => r.request().method() === 'POST' && /Login\.aspx/i.test(r.url()), { timeout: 30000 }).catch(() => null), page.click('a[onclick="login()"]')]);
  await page.waitForTimeout(1200);
  const sw: any = await page.evaluate(`(() => { var de = document.documentElement; var c = document.querySelector('.swal2-popup'); var b = c ? c.getBoundingClientRect() : null; return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflow: de.scrollWidth > de.clientWidth, popup: b ? { x: Math.round(b.x), w: Math.round(b.width), right: Math.round(b.right) } : null }; })()`);
  rec.afterFailedLogin = sw;
  await shot(page, `rs-login-${w}-error`, false);
  console.log('RS swal', w, JSON.stringify(sw));
  const fail = m.overflow || tapSmall.length > 0 || sw.overflow || (sw.popup && sw.popup.right > w);
  logCase({ group: GROUP, screen: SCREEN, caseId, instance: `Login @${w}px`, result: fail ? 'fail' : 'pass', findingIds: fail ? ['LG-14'] : [], reason: `overflow=${m.overflow} (scroll ${m.scrollWidth}/${m.clientWidth}) smallTargets=${tapSmall.join(',') || 'none'} swalOverflow=${sw.overflow} popup=${JSON.stringify(sw.popup)} axe=${axe.count}`, evidence: [shotPath, `audit/screenshots/rs-login-${w}-error.png`, axe.file] });
}
saveEvidence('login-responsive', report);
await s.close();
console.log('DONE login-responsive');
