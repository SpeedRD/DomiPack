# Phase 4 — Execution log (live)

Started 2026-09-03. Base URL https://clientes.domipack.com, test account DP-014003.
Conventions: `audit/reports/phase4-conventions.md`. Raw per-case records:
`audit/reports/execution-log/<group>.jsonl` (one JSON line per case × instance);
group narratives: `audit/reports/execution-log/<group>.md`. This file is the
consolidated view, refreshed by the coordinator as groups report.

## Pre-flight

| Check | Result | Evidence |
|---|---|---|
| NV-11 parallel independent logins (4 contexts, same account) | PASS — all 4 alive immediately and after 10s | `audit/scripts/phase4/nv11-concurrency-4ctx.ts`, `audit/notes/phase4-nv11-four-contexts.md` |
| Helper smoke test (login page, axe, screenshot, case log) | PASS | `audit/scripts/phase4/_smoke-helper.ts` |

## Work split (one browser context per group, parallel)

| Group | Screens | Status |
|---|---|---|
| login | Login, Nueva Cuenta | done (`execution-log/login.md`) |
| micuenta | Mi Cuenta (Datos Personales, Dependientes, Direccion) + shared chrome | done (`execution-log/micuenta.md`) |
| rastreo | Rastreo, Movimientos modal, Historial modal, Adjuntos dialog | done (`execution-log/rastreo.md`) |
| docs | Estado de Cuenta, Prueba de Exportación, PreAlerta, PagoOnline | done (`execution-log/docs.md`) |

## Coverage (consolidated)

_Refreshed 2026-09-04T03:21:49.792Z from docs, login, micuenta, rastreo group logs. "Applicable" = case × component-instance rows logged; "Executed" = pass + fail + executed-static._

| Screen (group / screen) | Applicable | Executed | Passed | Failed (cases → findings) | Executed-static | Omitted |
|---|---|---|---|---|---|---|
| docs / Estado de Cuenta | 29 | 24 | 8 | 13 (7 findings) | 3 | 5 |
| docs / PagoOnline | 20 | 17 | 7 | 6 (9 findings) | 4 | 3 |
| docs / PreAlerta | 64 | 61 | 17 | 15 (14 findings) | 29 | 3 |
| docs / Prueba de Exportación | 29 | 24 | 11 | 9 (6 findings) | 4 | 5 |
| login / Login | 56 | 51 | 18 | 26 (17 findings) | 7 | 5 |
| login / Nueva Cuenta | 78 | 74 | 12 | 43 (18 findings) | 19 | 4 |
| micuenta / Mi Cuenta > Datos Personales | 110 | 106 | 5 | 19 (13 findings) | 82 | 4 |
| micuenta / Mi Cuenta > Dependientes | 65 | 62 | 2 | 15 (12 findings) | 45 | 3 |
| micuenta / Mi Cuenta > Direccion | 30 | 27 | 0 | 17 (13 findings) | 10 | 3 |
| micuenta / Mi Cuenta > Tarjetas Registradas (hidden) | 1 | 1 | 0 | 0 (1 findings) | 1 | 0 |
| micuenta / Shared chrome | 27 | 27 | 8 | 18 (6 findings) | 1 | 0 |
| rastreo / Rastreo (grid #cpBody_gvDatos) | 9 | 8 | 1 | 6 (5 findings) | 1 | 1 |
| rastreo / Rastreo (navigation) | 7 | 4 | 4 | 0 (0 findings) | 0 | 3 |
| rastreo / Rastreo > Adjuntos (dlg/Adjuntos.aspx popup) | 7 | 6 | 1 | 3 (3 findings) | 2 | 1 |
| rastreo / Rastreo > Historial Guías (modal) | 24 | 24 | 4 | 16 (8 findings) | 4 | 0 |
| rastreo / Rastreo > Menu dropdown (#cpBody_bpagar) | 2 | 2 | 2 | 0 (0 findings) | 0 | 0 |
| rastreo / Rastreo > Movimientos del Paquete (VerGuia modal) | 8 | 8 | 5 | 1 (1 findings) | 2 | 0 |
| rastreo / Rastreo | 13 | 12 | 5 | 6 (6 findings) | 1 | 1 |
| **Total** | **579** | **538** | **110** | **213** (105 findings in findings.json) | **215** | **41** |

Findings by severity: {"menor":63,"mayor":40,"critico":2}; by category: {"ux-ui":20,"accesibilidad":27,"responsive":6,"copy-contenido":14,"validacion":15,"servidor":4,"funcional":8,"robustez":11}.

## Omitted cases (with reason)

- docs / Estado de Cuenta — **TB-01** (#cpBody_gvDatos): La cuenta de prueba tiene 3 filas; no se puede observar el estado vacío (DXEmptyRow=0)
- docs / Estado de Cuenta — **TB-03** (#cpBody_gvDatos): No hay cuenta/periodo de alto volumen disponible (3 filas); sin filtro de fechas para forzar un dataset mayor
- docs / Estado de Cuenta — **NV-10** (Login.aspx / raíz (chrome compartido)): Caso RUN-LAST propiedad de otro grupo (login/micuenta); no se navega a Login.aspx desde este contexto (riesgo de sesión)
- docs / Estado de Cuenta — **BT-08** (Salir (chrome compartido)): Caso RUN-LAST propiedad del grupo micuenta (chrome compartido); no se hace clic en Salir desde este contexto
- docs / Estado de Cuenta — **AX-02** ((no form fields)): Coordinator gap-check: AX-02 targets placeholder-labelled form fields; Estado.aspx renders no form inputs (read-only grid + PDF icons). Icon-name coverage is under AX-03/BT-06 (EC-04).
- docs / PagoOnline — **NV-10** (Login.aspx / raíz (chrome compartido)): Caso RUN-LAST propiedad de otro grupo (login/micuenta); no se navega a Login.aspx desde este contexto (riesgo de sesión)
- docs / PagoOnline — **BT-08** (Salir (chrome compartido)): Caso RUN-LAST propiedad del grupo micuenta (chrome compartido); no se hace clic en Salir desde este contexto
- docs / PagoOnline — **AX-02** ((hidden checkout sub-form only)): Coordinator gap-check: the only form fields on PagoOnline.aspx belong to the hidden checkout sub-form (display:none, STATIC-ONLY); no visible labelled/placeholder fields to test. Static observations are in PO-06.
- docs / PreAlerta — **TF-08** (#cpBody_Suplidor, #cpBody_contenido): No son campos nombre/ID con formato definido
- docs / PreAlerta — **NV-10** (Login.aspx / raíz (chrome compartido)): Caso RUN-LAST propiedad de otro grupo (login/micuenta); no se navega a Login.aspx desde este contexto (riesgo de sesión)
- docs / PreAlerta — **BT-08** (Salir (chrome compartido)): Caso RUN-LAST propiedad del grupo micuenta (chrome compartido); no se hace clic en Salir desde este contexto
- docs / Prueba de Exportación — **TB-01** (#cpBody_gvDatos): La cuenta tiene 4 filas; estado vacío no observable (DXEmptyRow=0)
- docs / Prueba de Exportación — **TB-03** (#cpBody_gvDatos): No hay cuenta de alto volumen disponible (4 filas); sin filtro para forzar más datos
- docs / Prueba de Exportación — **NV-10** (Login.aspx / raíz (chrome compartido)): Caso RUN-LAST propiedad de otro grupo (login/micuenta); no se navega a Login.aspx desde este contexto (riesgo de sesión)
- docs / Prueba de Exportación — **BT-08** (Salir (chrome compartido)): Caso RUN-LAST propiedad del grupo micuenta (chrome compartido); no se hace clic en Salir desde este contexto
- docs / Prueba de Exportación — **AX-02** ((no form fields)): Coordinator gap-check: AX-02 targets placeholder-labelled form fields; PruebaExportacion.aspx renders no form inputs (read-only grid). Icon-name coverage is under AX-03/BT-06 (PE-03).
- login / Login — **TF-08** (#lUser): No es campo de nombre/cédula/RNC; el usuario es un código de cuenta (DP-xxxxxx).
- login / Login — **TF-11** ((textarea)): Login no tiene textarea.
- login / Login — **TF-12** ((disabled fields)): Login no tiene campos deshabilitados al cargar.
- login / Login — **CC-04** (footer): Login no renderiza footer (footerPresent=false); el footer compartido se audita en shared chrome (SH-).
- login / Login — **AX-03** ((no icon-only controls)): Coordinator gap-check: Login.aspx has no icon-only controls (Entrar, Recuperar, Crear Cuenta all have visible text; the checkbox is covered by CB-01/LG-10). Not applicable.
- login / Nueva Cuenta — **EM-07** ((Mi Cuenta #cpBody_lEmail)): Caso exclusivo de Mi Cuenta (grupo micuenta).
- login / Nueva Cuenta — **PH-03** ((#cpBody_lCelularDependiente)): Campo de Mi Cuenta > Dependientes (grupo micuenta).
- login / Nueva Cuenta — **TF-11** ((textarea)): Nueva Cuenta no tiene textarea.
- login / Nueva Cuenta — **AX-03** ((no icon-only controls)): Coordinator gap-check: NuevaCuenta.aspx has no icon-only controls; the submit has visible text 'Crear Cuenta' and the unlabeled checkboxes are covered by CC-05/NC-02. Not applicable.
- micuenta / Mi Cuenta > Datos Personales — **TF-11** (n/a): no textarea on Datos Personales
- micuenta / Mi Cuenta > Datos Personales — **SL-05** (#cpBody_lSucursal): select is disabled for this account: not focusable/operable by keyboard by design; keyboard operation cannot be evaluated here
- micuenta / Mi Cuenta > Datos Personales — **BT-06** (#cpBody_Button1 (Guardar)): not an icon-only button: value="Guardar" gives it an accessible name; icon-only controls of the shared chrome are covered under Shared chrome BT-06/AX-03 (SH-01, SH-02)
- micuenta / Mi Cuenta > Datos Personales — **AX-03** ((no screen-specific icon-only controls)): Coordinator gap-check: Datos Personales has no icon-only controls of its own (Guardar has visible text); the icon-only controls on this page are the shared chrome (hamburger, user menu) covered by SH-01/SH-02 under Shared chrome AX-03.
- micuenta / Mi Cuenta > Dependientes — **TF-11** (n/a): no textarea on Dependientes
- micuenta / Mi Cuenta > Dependientes — **TF-12** (n/a): no disabled-on-load field on Dependientes
- micuenta / Mi Cuenta > Dependientes — **AX-03** (n/a): no icon-only controls inside the tab (grid is empty, so no per-row Editar/Borrar icons rendered); shared-chrome icon controls covered under Shared chrome AX-03
- micuenta / Mi Cuenta > Direccion — **DS-03** (#cpBody_cbProvincia -> cbCiudad -> cbSector): Pais and Provincia load disabled for this account (disabled=true/true); their onchange is a full __doPostBack, and re-enabling them via DevTools could persist state server-side — cascade not exercisable (see DS-06)
- micuenta / Mi Cuenta > Direccion — **DS-04** (#cpBody_cbProvincia -> cbCiudad -> cbSector): Pais and Provincia load disabled for this account (disabled=true/true); their onchange is a full __doPostBack, and re-enabling them via DevTools could persist state server-side — cascade not exercisable (see DS-06)
- micuenta / Mi Cuenta > Direccion — **DS-05** (#cpBody_cbProvincia -> cbCiudad -> cbSector): Pais and Provincia load disabled for this account (disabled=true/true); their onchange is a full __doPostBack, and re-enabling them via DevTools could persist state server-side — cascade not exercisable (see DS-06)
- rastreo / Rastreo (grid #cpBody_gvDatos) — **TB-03** (#cpBody_gvDatos): test account has 1 data row(s) in 1 group; no high-volume account/date range available (pageRowSize=10 in client state, pageCount=1)
- rastreo / Rastreo (navigation) — **NV-06** (PagoOnline.aspx reachability): PagoOnline reachability is covered by the docs group (PO- prefix); not exercised here
- rastreo / Rastreo (navigation) — **NV-10** (session self-invalidation): owned by micuenta/login group
- rastreo / Rastreo (navigation) — **BT-08** (Salir): owned by micuenta/login group
- rastreo / Rastreo > Adjuntos (dlg/Adjuntos.aspx popup) — **BT-06** (Adjuntos upload/attach control): no upload control present in the DOM (file inputs=0); nothing to inspect; per hard rules no upload attempted
- rastreo / Rastreo — **RS-05** (mobile nav toggle): shared chrome, owned by micuenta group (SH- prefix)


## Sitemap additions discovered during execution

All evidence-based (a link, redirect, form action or download URL seen during a case); at most one confirming GET each; none explored further.

| Route / item | Found via | Confirmation | Group log |
|---|---|---|---|
| `GET /rep/Export/<guid>.pdf` | `download.url` of the Estado de Cuenta per-row PDF postback | 3 valid invoice PDFs saved (`audit/logs/evidence/estado-row{0,1,2}.pdf`); note the double slash in the URL | docs |
| `POST /PruebaExportacion.aspx` → PDF attachment | Per-row `Imprimir` click; the postback response itself is the PDF | 4 valid Air Waybill PDFs (`audit/logs/evidence/prueba-row{0..3}.pdf`) | docs |
| `/WebService1.asmx` (ASMX web service) | Inline `$.ajax` calls in Rastreo, Prueba de Exportación, PagoOnline and Nueva Cuenta scripts (`GetPaquetesCan`, `GetEstatus`, `GetNombreCedula`, `GetNombreRNC`, `Sectores`…) | One confirming GET → 200 service description page listing ~26 operations (`audit/logs/evidence/rastreo-sitemap-WebService1.html`). Not exercised beyond the lookups the app itself fires from Nueva Cuenta. Neutral note for the client: the operation directory is publicly listable. | rastreo, docs, login |
| `index.html` (Login logo link) | `href` of the logo on Login.aspx | GET → 404 "File or directory not found" (finding LG-09) | login |
| `NuevaCuenta.aspx?medio=<code>` | Inline JS on NuevaCuenta.aspx reads a `medio` query parameter to preselect the "Referido" select | Documented from the script only (competing handlers noted in NC-10); no extra GETs | login |
| Nueva Cuenta hidden sub-controls | DOM of NuevaCuenta.aspx | `#bsendConfi`, `#codigoPromo`, `#TokenID` (fixed token in HTML, noted neutrally), `#cbPais/#cbProvincias`; nothing fired | login |
| Hidden "Historial Guías" modal markup inside PruebaExportacion.aspx | Recon HTML | Not a new URL; the Rastreo modal is embedded hidden in Prueba de Exportación | docs |
| Mi Cuenta hidden controls | DOM of MiCuenta.aspx (`display:none` ancestors) | `#cpBody_lIdentificacion`, `#cpBody_ckConsolidation`, `#cpBody_lCupon` + `#cpBody_BVerificar` "Canjear Cupon", `#cpBody_Button2/6/4` (Agregar Dependiente / Direccion / Tarjeta), relays `bGuardarClientes`, `BGuardarDependientes`, `bEditar`, `BEliminar1`, hidden `TokenID/ClienteID/DireccionID/DependienteId`; master-page `#lsClienteID` + `#SetCliente`. Tarjetas Registradas tab renders fully (grid `#cpBody_gvTarjetas`, delete popup `#cpBody_ppDelCard`). Nothing fired. | micuenta |
| External dependencies (not routes) | Page markup | `http://maps.google.com/maps/api/js` (blocked mixed content on every authenticated page, no visible effect), `http://sys.translogic.com.do/img/Clip.png` (AD column icon), `https://tainoexpress.com` footer image, `i.postimg.cc` image on Nueva Cuenta (NC-18), jQuery 1.7.1 over http on Login (LG-18) | all |

## Inventory corrections surfaced by execution (feed back to Phase 2 files in Phase 8)

- Prueba de Exportación `Imprimir` icons are **enabled and functional** for every row; Phase 1/2 misread `ASPx.AddDisabledItems(...)` as a disabled state (`audit/notes/devexpress-adddisableditems-is-not-disabled.md`). Matrix TB-10's "find why disabled" premise does not apply.
- Rastreo "Movimientos del Paquete" popup **does** have a visible close button and closes on Esc (Phase 1 note was wrong; MD-04 passes). Its real defects are fixed 1000×600 sizing (RA-18) and focus management (RA-13).
- Mi Cuenta: `#cpBody_Button3` reads "Guardar Dependiente", `#cpBody_bDireccion` reads "Guardar Direccion", `#cpBody_tbNota` is an `<input>` not a textarea, `#cpBody_lCodigo` is `readonly`.
- Login `Recuperar()` is `#bRecuperar.click()` on the same login form (no dedicated recovery screen); never fired.

## Triage notes (noise deliberately not promoted)

- Blocked mixed-content `http://maps.google.com/maps/api/js` on every authenticated page: `window.google` unused, zero observable effect → summary only.
- 14 `<g> attribute transform: scale(NaN)` SVG console errors during viewport resizing (hamburger icon animation), no visible impact.
- Native HTML5 validation bubbles appear in English in headless Chromium (browser locale), reported as "the app defines no messages of its own", not as app copy.
- LG-18 (jQuery 1.7.1 over http blocked on Login, page works via a second jQuery) was kept but marked `impacto_a_confirmar` by the coordinator: no visible effect today, the `load` event never firing is the only concrete symptom.
- Console/network logs for the `p4-login-fields` and `p4-nueva-cuenta-fields` sessions were not flushed (scripts aborted on timeouts before `close()`); their evidence lives in the per-case JSON files under `audit/logs/evidence/`.
- No HTTP ≥400 responses occurred in the micuenta sessions; the ≥400s in the other groups are all tied to promoted findings (RA-03, RA-15, LG-05, LG-09, LG-13, PO-01).

## Session-hazard handling

- Every group ran in its own Playwright browser context with its own login (NV-11 re-verified with 4 contexts at start).
- No authenticated context navigated to `Login.aspx` or `/` except as the final action: BT-08 (`Salir`) in the micuenta group's dedicated last script and NV-10 in the login group's last script.
- NV-12 idle timeout: a single bounded observation (9 minutes idle, still authenticated). The real server timeout is longer and was not probed further.

## Interruptions

- All four workers were interrupted once by an API session rate limit (2026-09-03 ~22:35 local) and resumed from their own transcripts ~30 minutes later; on-disk JSONL/finding files were re-checked before continuing so no case was double-counted (the consolidator keeps the last record per group|screen|case|instance; the rastreo worker additionally produced `rastreo.dedup.jsonl`, which the consolidator prefers).
- The rastreo recon session's console/network logs were lost to a `| head` pipe (`audit/notes/phase4-no-head-pipe.md`); every case session has its logs.

## Headline findings (full records in `audit/findings/findings.json`, 105 findings)

Critical (2):
- **RA-03** — Historial Guías `Buscar` with empty, partial or impossible dates returns an unhandled HTTP 500 ASP.NET "Runtime Error" page; app chrome lost.
- **RA-09** — Any DevExpress callback on the Rastreo grid (sort a column, collapse the status group) returns an empty grid ("No data to display"); only a reload restores the packages.

Server/robustness majors: **LG-05** (special characters in user or password → HTTP 500), **LG-13** (unauthenticated `dlg/Adjuntos.aspx` → 500 instead of redirect to Login), **RA-15** (Adjuntos with missing/invalid params → 500, impact to confirm), **PO-01** (PagoOnline.aspx → 500 for the rest of the session after visiting Estado.aspx or MiCuenta.aspx, impact to confirm), **LG-16** (visiting Login.aspx with a session logs the user out), **LG-08** (successful login takes ~17–18 s with no feedback), **LG-03** (empty password submits silently).

Cross-screen accessibility majors (Phase 7 will pattern these): placeholder-only / unassociated labels on every form (LG-01, NC-01, MC-01, PA-01, RA-02), no visible focus indicator on links/icons (LG-10, MC-08, RA-08), positive `tabindex` breaking tab order (NC-13, PA-11), icon-only controls without names (EC-04, PE-03, RA-07, SH-01, SH-02), contrast/`lang`/`user-scalable=no`/no landmarks on every screen (LG-11, NC-17, MC-16, MC-19, EC-07, RA-19), grids without table semantics (MC-12, EC-02, RA-06).

Responsive majors: EC-03 (Estado grid overflows at 375/768), MC-18 (Mi Cuenta horizontal overflow on all tabs), RA-12 (Historial modal header under the fixed top bar; × unreachable at 375), RA-18 (Movimientos popup fixed 1000×600).

Findings marked `impacto_a_confirmar` (need server-side execution or another account): 21 — chiefly the STATIC-ONLY form findings on Mi Cuenta, Nueva Cuenta and PreAlerta, and the PagoOnline observations (account has the feature hidden).

## Status

Phase 4 complete for all screens in the sitemap. Not executable with this account/environment (logged as omitted with reasons): TB-03 high-volume grids (no high-volume account), DS-03/04/05 address cascade (Pais/Provincia locked for DP-014003), server-side behaviour of the five STATIC-ONLY submits (by rule), NV-12 beyond a 9-minute idle window.
