// Probe: identify the stretched graphic rendered at the bottom of NuevaCuenta.aspx (seen in full-page screenshots).
import { startSession, saveEvidence, shot, BASE_URL } from '../../support/phase4.ts';
const s = await startSession({ name: 'p4-nueva-cuenta-footer-probe', auth: false });
const page = s.page;
await page.goto(`${BASE_URL}/NuevaCuenta.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const info = await page.evaluate(`(() => {
  var out = [];
  document.querySelectorAll('body *').forEach(function (el) {
    var b = el.getBoundingClientRect(); var top = b.top + window.scrollY;
    if (top > 1250 && b.height > 100 && b.width > 0) {
      var cs = getComputedStyle(el);
      out.push({ tag: el.tagName, id: el.id, cls: (el.className || '').toString().slice(0, 60), top: Math.round(top), h: Math.round(b.height), w: Math.round(b.width), left: Math.round(b.left), display: cs.display, position: cs.position, bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0, 120), src: el.tagName === 'IMG' ? el.src : undefined, natural: el.tagName === 'IMG' ? el.naturalWidth + 'x' + el.naturalHeight : undefined, opacity: cs.opacity, visibility: cs.visibility });
    }
  });
  return { docHeight: document.documentElement.scrollHeight, viewportH: window.innerHeight, items: out.slice(0, 20) };
})()`);
console.log(JSON.stringify(info, null, 1));
saveEvidence('NC-18-footer-probe', info);
// viewport-only screenshot after scrolling to the bottom (what a user actually sees)
await page.evaluate(`window.scrollTo(0, document.documentElement.scrollHeight)`);
await page.waitForTimeout(500);
await shot(page, 'NC-18', false);
await s.close();
