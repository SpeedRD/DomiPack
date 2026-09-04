# A successful login is a single ~17 s POST answered with 302 → /Rastreo.aspx (no intermediate page)

Measured in `login-loading.ts` (4 throwaway contexts): `POST Login.aspx` with valid credentials takes
17.4–18 s server-side and returns `302 Location: /Rastreo.aspx` (empty body). Nothing changes in the DOM
meanwhile (button stays enabled, no blockUI/preloader/swal). The Phase 1 "Loading https://…/Rastreo.aspx"
title is just the browser's navigation state, not an application page.

Implications:
- Double-click / second click during the wait produce **one** POST (the browser is already navigating;
  a Playwright `click` during that window times out). No duplicate-login finding (BT-01 pass).
- Navigating the same tab to a public page (NuevaCuenta.aspx) 1.5 s after clicking Entrar aborts the
  navigation but the server still completes the login: the context is authenticated afterwards
  (BT-04 pass).
- Wrong-credential attempts answer in ~1.3 s with `200` and a SweetAlert; empty or whitespace-only
  password answers `200` with **no** message (LG-03). Special characters (`'`, `%`, …) in either field
  answer `500` "Runtime Error" (LG-05) — keep probes minimal; the error page has no way back.
- Budget ~20 s per real login per context; wrong-password attempts in one unauthenticated context are
  cheap and safe (they never create a session).
