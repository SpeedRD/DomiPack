// Probe: which element causes horizontal overflow on Login.aspx at 768/1440, and which resource keeps `load` pending.
import { startSession, saveEvidence, BASE_URL } from '../../support/phase4.ts';
const s = await startSession({ name: 'p4-login-overflow-probe', auth: false });
const page = s.page;
const out: any = {};
for (const w of [768, 1440]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(`${BASE_URL}/Login.aspx`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  out[w] = await page.evaluate(`(() => {
    var cw = document.documentElement.clientWidth;
    var res = [];
    document.querySelectorAll('body *').forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (b.right > cw + 1 && b.width > 0) {
        var cs = getComputedStyle(el);
        res.push({ tag: el.tagName, id: el.id, cls: (el.className || '').toString().slice(0, 60), right: Math.round(b.right), width: Math.round(b.width), left: Math.round(b.left), position: cs.position, display: cs.display, visibility: cs.visibility, opacity: cs.opacity });
      }
    });
    return { clientWidth: cw, scrollWidth: document.documentElement.scrollWidth, readyState: document.readyState, bodyOverflowX: getComputedStyle(document.body).overflowX, htmlOverflowX: getComputedStyle(document.documentElement).overflowX, offenders: res.slice(0, 15) };
  })()`);
  console.log(w, JSON.stringify(out[w]));
}
// pending resources (why 'load' never fires)
await page.waitForTimeout(4000);
out.pending = await page.evaluate(`(() => {
  var entries = performance.getEntriesByType('resource').map(function (e) { return { name: e.name.slice(0, 120), dur: Math.round(e.duration), status: e.responseStatus }; });
  var slow = entries.filter(function (e) { return e.dur > 3000; });
  var scripts = Array.from(document.scripts).map(function (s) { return s.src; }).filter(Boolean);
  var imgs = Array.from(document.images).map(function (i) { return { src: i.src.slice(0, 120), complete: i.complete, w: i.naturalWidth }; });
  var links = Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(function (l) { return l.href.slice(0, 120); });
  var loaded = new Set(entries.map(function (e) { return e.name; }));
  var missing = scripts.concat(links).filter(function (u) { return !loaded.has(u); });
  return { readyState: document.readyState, total: entries.length, slow: slow, notInPerf: missing, imgs: imgs };
})()`);
console.log('pending', JSON.stringify(out.pending));
saveEvidence('LG-14-overflow-probe', out);
await s.close();
