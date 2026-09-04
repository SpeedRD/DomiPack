# Login.aspx never reaches `load` — use `domcontentloaded` (and never `networkidle`) on public pages

`page.goto('…/Login.aspx', { waitUntil: 'load' })` and `waitUntil: 'networkidle'` both time out
(30 s) in headless Chromium, while `domcontentloaded` returns in ~1 s and the page is fully usable.
`document.readyState` stays `interactive`; `performance.getEntriesByType('resource')` lists every
script/stylesheet/image as complete (no slow entries), and the only console error is the mixed-content
block of `http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js` (finding LG-18). Whatever
keeps the load event pending, it is not visible from resource timing, so do not wait for it.

Practical rules used by the `login-*` / `nueva-cuenta-*` scripts (`audit/scripts/phase4/`):
- `goto(..., { waitUntil: 'domcontentloaded' })` + `waitForTimeout(800–2500)` before measuring.
- Detect the end of a login POST with `waitForResponse(POST Login.aspx)` / `waitForURL(!Login.aspx)`,
  never with `load`.
- NuevaCuenta.aspx does fire `load` (its `$(window).load` preloader handlers run: `.se-pre-con` ends
  `display:none`), but the same `domcontentloaded` rule keeps scripts uniform.
