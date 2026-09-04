# `Salir` is only `window.location.href='/Login.aspx'`; the session dies because Login.aspx abandons it, and the cookie survives

Measured in `shared-bt08-last.ts` (2026-09-03, after a 9-minute idle that did **not** expire the session):
- Clicking `Salir` produced exactly one request: `GET /Login.aspx` → 200 (no logout endpoint, no `Set-Cookie`).
- A following `GET /MiCuenta.aspx` → 302 → `Login.aspx` (session ended).
- `ASP.NET_SessionId` kept the same value before and after (session cookie, `expires=-1`,
  `HttpOnly`, `Secure=false`, `SameSite=Lax`).

So logout == "visit Login.aspx" (the self-invalidation described in `session-behavior.md`).
Implications: any accidental navigation to `/Login.aspx` or `/` logs the user out (already known), and
there is no server-side logout to call from scripts — ending a context is simply `page.goto(Login.aspx)`
as the last action. NV-12: 9 min idle is below the server timeout; longer windows were not tested.
