# Phase 4 execution log — group `rastreo` (Rastreo.aspx + modals + Adjuntos)

Executed 2026-09-03/04 against https://clientes.domipack.com with account DP-014003, Playwright
(headless Chromium, viewport 1440×900; RS cases at 375×812 / 768×1024 / 1440×900). Every case ×
instance is in `audit/reports/execution-log/rastreo.jsonl` (raw, 119 records incl. reruns and
corrections) and `rastreo.dedup.jsonl` (last record per screen×case×instance wins, 70 records —
use this one). Findings: `audit/findings/partial/rastreo.json` (18 findings, RA-01…RA-20, ids
RA-16/RA-17 intentionally unused: NV-02 and horizontal-overflow checks passed).

Scripts (`audit/scripts/phase4/`): `rastreo-recon.ts`, `rastreo-grid.ts`,
`rastreo-historial-dates.ts`, `rastreo-modals.ts` (Menu + Movimientos), `rastreo-modals-historial.ts`,
`rastreo-adjuntos.ts`, `rastreo-adjuntos-recheck.ts`, `rastreo-nav.ts`, `rastreo-responsive-axe.ts`,
`rastreo-finalize-log.ts` (appends criterion corrections and writes the dedup file).

## Counts per sub-view (from rastreo.dedup.jsonl)

| Sub-view | applicable | executed | pass | fail | executed-static | omitted | findings |
|---|---|---|---|---|---|---|---|
| Rastreo (page: RS/AX/CC/TB-07) | 13 | 12 | 5 | 6 | 1 | 1 | RA-02, RA-05, RA-08, RA-11, RA-18, RA-19 |
| Rastreo grid `#cpBody_gvDatos` | 9 | 8 | 1 | 6 | 1 | 1 | RA-05, RA-06, RA-07, RA-08, RA-09 |
| Historial Guías modal (dates + modal cases) | 24 | 24 | 4 | 16 | 4 | 0 | RA-01, RA-02, RA-03, RA-04, RA-10, RA-12, RA-13, RA-20 |
| Menu dropdown `#cpBody_bpagar` | 2 | 2 | 2 | 0 | 0 | 0 | — |
| Movimientos del Paquete (VerGuia popup) | 8 | 8 | 5 | 1 | 2 | 0 | RA-13 |
| Adjuntos popup `dlg/Adjuntos.aspx` | 7 | 6 | 1 | 3 | 2 | 1 | RA-06, RA-14, RA-15 |
| Navigation (NV) | 7 | 4 | 4 | 0 | 0 | 3 | — |
| **Total** | **70** | **64** | **22** | **32** | **10** | **6** | 18 findings |

"executed" = everything not omitted (pass + fail + executed-static).

## Omitted (with reasons)
- TB-03 (grid volume) — test account has 1 data row in 1 group; no high-volume account or date range available (client state: pageRowSize=10, pageCount=1). Historial wide range gives at most 10 rows.
- BT-06 (Adjuntos upload control) — no upload/attach control exists in the dialog DOM for this record; nothing to inspect, and uploads are forbidden by the rules anyway.
- NV-06 (PagoOnline reachability) — covered by the docs group (PO- prefix).
- NV-10 / BT-08 (session self-invalidation / Salir) — owned by the micuenta/login group.
- RS-05 (mobile nav toggle) — shared chrome, owned by the micuenta group (SH- prefix).

## Findings (one line each)
| id | sev | summary |
|---|---|---|
| RA-01 | menor | Literal "gv" rendered after Fecha Hasta in the Historial modal (copy) |
| RA-02 | menor | Date inputs have no programmatic label (label without for) |
| RA-03 | **critico** | Buscar with empty/partial/impossible dates → HTTP 500 raw ASP.NET "Runtime Error" page |
| RA-04 | menor | Buscar has no debounce/loading state; double-click fires 2 POSTs |
| RA-05 | mayor | Group collapse toggle (img onclick) not keyboard reachable/operable |
| RA-06 | menor | Grid headers are `td` (no th/scope) — Rastreo and Adjuntos grids |
| RA-07 | menor | Icon-only row controls unnamed or misnamed ("Clone" for "Subir Factura", clip img without alt) |
| RA-08 | menor | No visible focus indicator on grid links and sidebar item |
| RA-09 | **critico** | Any grid callback (sort a column, collapse the group) empties the grid → "No data to display"; only a reload restores it |
| RA-10 | menor | Inverted date range accepted silently; generic English empty state for "no results" |
| RA-11 | menor | Copy: "tu Paquetes", missing accents (Guia/Historial Guias/Codigo), English DevExpress strings, US date format, lang=en |
| RA-12 | mayor | Historial modal header sits under the fixed top bar: title clipped, × not clickable at its centre (1440/768), fully hidden at 375 |
| RA-13 | mayor | Focus management: no initial focus/trap/return in Historial (Esc only works with focus inside); Movimientos popup has nothing focusable, close button is a div |
| RA-14 | menor | Adjuntos opens a bare new tab: no title, chrome, close/back, or explanation; English empty state |
| RA-15 | mayor (impacto_a_confirmar) | dlg/Adjuntos.aspx with missing/invalid params → HTTP 500 raw error; unknown `cl` silently shows an empty grid (ownership check not verified — out of scope) |
| RA-18 | mayor | Movimientos popup is fixed 1000×600 px: overflows 375/768 viewports, × off-screen, horizontal scroll |
| RA-19 | menor | axe: contrast (subheading, sidebar), clip img without alt, no landmarks/h1 (shared-chrome items noted for SH-) |
| RA-20 | mayor | Historial results replace the grid with no active-filter indicator or reset, and persist server-side for the session (Back/Forward/reload/new GET all keep the filtered set) |

## Sub-view notes

### Historial Guías modal (`#modal_Historial`, `Buscar` → `Filtro()` → hidden `#cpBody_bFiltro` submit, full postback)
- All DR cases executed for real (search is non-destructive). Results render in the **page grid**, the modal closes, dates persist only inside the closed modal.
- DR-02 absurd range 1900→2999: HTTP 200 in 4.2 s (vs ~0.8 s baseline), 80 KB, 10 rows (whole history) — acceptable, no timeout.
- DR-05 same-day (2026-09-02) returns the record inclusively. DR-06 future range → "No data to display".
- DR-03/DR-04/DR-07(server) → HTTP 500 (RA-03). DR-07 browser level: Chromium sanitises 2026-02-30 to '' (badInput=true when typed).
- BT-01 double-click → 2 POSTs (RA-04). MD-02: backdrop click dismisses (Bootstrap default); MD-05: rapid double trigger just toggles, no stacked modal/backdrop.
- Menu dropdown (MD-10): opens/closes by click, click-outside, Esc, Enter; aria-expanded toggles; double-click toggles closed. ArrowDown does not move focus to "Histórico" (item lacks `.dropdown-item`) — minor, not promoted.

### Movimientos del Paquete (`VerGuia()` → hidden `#cpBody_bPaquetes` submit, ASPxPopupControl `cpBody_ppCambioGuia`)
- Contrary to the Phase 1 note, the popup **does** have a visible close button (`#cpBody_ppCambioGuia_HCB-1`, 28×28 at 1440) and Esc closes it (`closeOnEscape:true`); backdrop click does not (`closeAction:'CloseButton'`) — inconsistent with the Historial modal. MD-04 therefore passes; the problem is keyboard access (RA-13) and size (RA-18).
- Content: group "Guia: DP01-003068340001" with 3 movements (Recibido Miami → Empacado → Embarcado). The page grid keeps its data after this postback. Double-click on the tracking link fires 1 POST, 1 popup.

### Grid
- Adaptive mode hides Servicio/Total at 1440, more at 768/375; the "…" (`a.dxgvADSB`) detail is client-side and works at all widths (TB-06 pass). No pager/filter row (TB-04, small dataset).
- Sorting and group collapse are callbacks and lose the data (RA-09). The Post-Alerta command button (`DXCBtn0`, CustomButton "Clone", tooltip "Subir Factura") and a hidden `DXCBtn2` ("X") were inspected but **not clicked** (possible write actions).

### Adjuntos (`dlg/Adjuntos.aspx`, `target=_blank` new tab, not window.open)
- Baseline URL responds 302 to `/dlg/Adjuntos.aspx` (params stored server-side), then an empty DevExpress grid; no upload control in the DOM (nothing attempted). NV-07: 9 variants via request API + 5 via a real tab (RA-15).

### Navigation
- Back after the Historial POST returns a valid page (Playwright threw a protocol error on `goBack` because the page was swapped; state was fine). Forward served from cache (0 POST); reload re-POSTs (1 POST) without error. `href="#"` on the tracking/Histórico/Buscar links adds a `#` history entry (`Rastreo.aspx#`). No resubmission loops, no Login redirects.

## Sitemap additions (evidence-based, one confirming GET each)
- `https://clientes.domipack.com/WebService1.asmx` — referenced by Rastreo.aspx inline JS (`$.ajax` to `WebService1.asmx/GetPaquetesCan` and `/GetEstatus` in functions `GetPaquetesCan()`/`GetEstatus()`, not wired to any UI control found). GET → 200, ASMX service description page listing 26 operations (DesEncripty, Encripty, GetCalculadora, GetChartData…, GetEstatus, GetPaquetes, GetPaquetesCan, GetPaquetesHistorico, GetTicketAdjuntos, GetTickets, Provincias, RuaVerify, Sectores, UpdateGuiapty). Evidence: `audit/logs/evidence/rastreo-sitemap-WebService1.html`, `rastreo-sitemap-additions.json`. Not explored further (not a pentest); worth a neutral note to the client that the service description is public to authenticated users.
- External dependency (not a route): `http://sys.translogic.com.do/img/Clip.png` (AD column icon, plain HTTP, auto-upgraded by Chromium).

## Notable non-findings / background noise
- Mixed content: `<script src="http://maps.google.com/maps/api/js?sensor=true">` is blocked by Chromium on every Rastreo load (console error). `window.google` is undefined and nothing on the page uses maps → zero observable impact; summary only. (Login.aspx has the same pattern with jquery 1.7.1 — login group.)
- Console/network logs: `audit/logs/console|network/p4-rastreo-*.{log,json}` (recon session's logs were lost: process killed by a `| head` pipe — see lesson).
- Hidden fields in Rastreo.aspx: `#cpBody_TokenID` value `GB123456789.101112131415` (static token used by the unused ajax functions), `#cpBody_Guia`, `#cpBody_ClienteID`. Not exercised.
- The DR-07 server probe was done by rewriting one POST body via `page.route` (validation check only).

## Lessons (also in audit/notes/)
- `phase4-no-head-pipe.md` — never pipe a script into `head` (kills the run before logs flush); `__name` shim is in the existing `tsx-evaluate-name-shim.md`.
- `rastreo-grid-callbacks-empty-grid.md` — any DevExpress callback on the grid returns no data; run sort/collapse last, reload after; Historial filter is session-sticky.
- `rastreo-historial-modal-esc-and-close.md` — Esc only works with focus inside the Historial modal, × is covered by the top bar; close it with a backdrop click in scripts; Movimientos popup behaves the opposite way.
