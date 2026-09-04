# Group `docs` — Estado de Cuenta, Prueba de Exportación, PreAlerta, PagoOnline

Executed 2026-09-03/04 against https://clientes.domipack.com with account DP-014003, one
Playwright context per script (own login each). Raw records: `audit/reports/execution-log/docs.jsonl`
(139 records, one per case × instance; the consolidator keeps the last record per key).
Findings: `audit/findings/partial/docs.json` (27, Spanish, one screenshot each under
`audit/screenshots/<id>.png`).

Scripts (`npx tsx audit/scripts/phase4/<file>` from the project root):

| Script | Purpose | Session log |
|---|---|---|
| `docs-recon.ts` | HTML/DOM/script dump of the 4 screens (read-only) | `p4-docs-recon` |
| `docs-common.ts` | shared helpers (`__name` shim, `logCase` wrapper, overflow + tab traversal) | — |
| `docs-estado.ts` | Estado grid cases TB-01/03/04/08/09/12, NV-03, BT-06/11, CC-01 | `p4-docs-estado` |
| `docs-estado-pdf.ts` | real clicks on the 3 per-row PDF icons (TB-10), NV-01, BT-07 | `p4-docs-estado-pdf` |
| `docs-prueba.ts` | Prueba grid cases incl. real Imprimir clicks (4 rows), TB-06 expander at 768/375 | `p4-docs-prueba` |
| `docs-prealerta.ts` | PreAlerta client-side probes with POST/submit safety nets (never fired) | `p4-docs-prealerta` |
| `docs-pagoonline.ts` | PagoOnline DOM-only cases + 500 characterisation sequence | `p4-docs-pagoonline` |
| `docs-responsive-axe.ts` | RS-01..04/TB-07 at 375/768/1440 + axe (1440 and 375) for the 4 screens | `p4-docs-responsive` |

Fixtures for FU-01: `audit/scripts/phase4/fixtures/` (1 KB txt, minimal PDF, `.pdf.exe`).

## Coverage

| Screen | Applicable (case × instance) | Executed | Passed | Failed | Executed-static | Omitted | Findings |
|---|---|---|---|---|---|---|---|
| Estado de Cuenta | 28 | 24 | 8 | 13 | 3 | 4 | EC-01..EC-07 |
| Prueba de Exportación | 28 | 24 | 11 | 9 | 4 | 4 | PE-01, PE-03 (+EC-01/02/06/07) |
| PreAlerta | 64 | 61 | 17 | 15 | 29 | 3 | PA-01..PA-12 (+EC-02/07) |
| PagoOnline | 19 | 17 | 7 | 6 | 4 | 2 | PO-01..PO-06 (+EC-02/06/07) |
| **Total** | **139** | **126** | **43** | **43** | **40** | **13** | **27 findings** |

"Failed" counts the case × instance records that produced or confirmed a finding (several
records share one finding, e.g. EC-02 across four grids).

## Findings (id — severity — one line)

| Id | Sev. | Summary |
|---|---|---|
| EC-01 | menor | Estado/Prueba grids without filter, search or pager (impact to confirm with a large account) |
| EC-02 | menor | All four DevExpress grids lack table semantics (`<td>` headers, 0 `<th>`, unlabeled totals footer) |
| EC-03 | mayor | Estado grid does not adapt at 375/768 px: document overflows horizontally (931/946 px), no scroll container |
| EC-04 | mayor | Estado PDF icons: no accessible name, `alt=""`, focus lands on an invisible 0×0 `input[type=submit]` |
| EC-05 | menor | Invoice PDF works but is named by GUID and served via an auxiliary window from `//rep/Export/<guid>.pdf` |
| EC-06 | menor | Three date formats across Estado / Prueba / PDF; header copy uses internal names; negative "Dias Vencidos" |
| EC-07 | mayor | axe on the 4 screens: `user-scalable=no`, contrast 2.36–4.14:1, no `<main>`/`<h1>`, `lang="en"` |
| PE-01 | menor | Prueba grid spills 3 px outside its card at 375 px |
| PE-03 | menor | Imprimir icons expose accessible name "Clone" (CustomButton id); they are NOT disabled and work |
| PA-01 | mayor | No `<label>`/aria-label on any PreAlerta field (axe label/select-name critical) |
| PA-02 | menor | "Codigo Cliente" disabled + required + unexplained; value does not travel in the POST |
| PA-03 | mayor | Submit without confirmation, double-submit protection or feedback; only native browser validation; Enter submits (static) |
| PA-04 | menor | Required fields accept whitespace-only |
| PA-05 | menor | No maxlength (100k chars accepted client-side) |
| PA-06 | mayor | Declared value accepts negative, zero, 20 digits, 6 decimals, scientific notation; no currency format |
| PA-07 | menor | Tracking has no format validation |
| PA-08 | menor | Carrier select has no placeholder option (UPS preselected satisfies `required`) |
| PA-09 | menor | File input without `accept`/size limit/feedback; `.exe` accepted client-side |
| PA-10 | menor | Empty grid text "No data to display"/"Loading…" in English; `<html lang="en">` |
| PA-11 | mayor | Positive tabindex values break the tab order (Tracking→Valor→Suplidor→Archivo→Transportista→Contenido) |
| PA-12 | menor | Copy: "Proovedor", missing accents, tú/usted mix, lowercase placeholder |
| PO-01 | mayor (a confirmar) | PagoOnline.aspx returns HTTP 500 for the rest of the session once Estado.aspx or MiCuenta.aspx was visited |
| PO-02 | menor | Row preselected server-side; footer "DOP$: 0.000" (3 decimals, unlabeled); rows not selectable by click |
| PO-03 | mayor (a confirmar) | "Pagar Con" enabled but its `<ul id=cpBody_ulFormaPagos>` is empty; "Opciones de entrega" card empty |
| PO-04 | mayor | Grid headers unreadable at 1440 px (Moderno theme, red-on-red, 3.92:1) |
| PO-05 | menor | Copy: "Pagas tu Paquetes", "Envianombre" header |
| PO-06 | menor (a confirmar) | Checkout JS: `GetLocation()()`, sync ajax + `alert('error')`, static `TokenID` in HTML (static note only) |

## Omitted (13 records, with reason)

| Screen | Case | Reason |
|---|---|---|
| Estado, Prueba | TB-01 | Grids not empty for this account (3 / 4 rows); empty state not observable |
| Estado, Prueba | TB-03 | No high-volume account/period available; no date filter to force a bigger dataset |
| PreAlerta | TF-08 (Suplidor, contenido) | Not name/ID fields with a defined format (TF-08 executed on Tracking) |
| All four | NV-10 | RUN-LAST case owned by login/micuenta groups; never navigate this context to Login.aspx |
| All four | BT-08 | `Salir` belongs to the shared chrome (micuenta group); not clicked from this context |

Cases run as `executed-static` (fill + inspect + abandon, never submitted): every PreAlerta
TF-03/04/05/06/07/09 probe, NM-04/05, SL-07, FU-01, BT-02/07, CC-03; PagoOnline TB-11, BT-09.
Safety nets in `docs-prealerta.ts` (route-abort of POST PreAlerta.aspx, neutralised
`form.submit`/`__doPostBack`, capture-phase submit cancel) reported `blocked POSTs=0,
intercepted submits=0` — nothing ever attempted to submit.

## Sitemap additions (evidence-based; at most one confirming GET each)

| Route | Evidence | Confirmation |
|---|---|---|
| `GET /rep/Export/<guid>.pdf` | `download.url` after the Estado PDF postback (`audit/logs/evidence/estado-pdf-clicks.json`, e.g. `https://clientes.domipack.com//rep/Export/a7f01673-fab6-4eb7-bd8e-0e5586214949.pdf`) | The download itself (3 valid PDFs saved as `audit/logs/evidence/estado-row{0,1,2}.pdf`). Whether the GUID URL is reachable without a session was **not** tested (out of scope). |
| `POST /PruebaExportacion.aspx` → PDF attachment | `audit/logs/evidence/prueba-print-clicks.json` (`download.url` = the page URL, file `TBA….pdf`) | 4 PDFs saved as `audit/logs/evidence/prueba-row{0..3}.pdf` |
| `/WebService1.asmx` (ASMX web service: `GetPaquetesCan`, `GetEstatus`, `Sectores`, …) | Inline scripts of PruebaExportacion.aspx and PagoOnline.aspx (`$.ajax({url: "WebService1.asmx/GetPaquetesCan"…})`, see `audit/logs/evidence/pagoonline-dom.json`) | One unauthenticated `curl GET /WebService1.asmx` → 200, ASMX operation directory listing 20+ operations (DesEncripty, Encripty, GetCalculadora, GetCupones, GetDependientes, GetNombreCedula, GetNombreRNC, GetPaquetes, …). Not explored further; noted neutrally. |
| Hidden "Historial Guias" modal + `#cpBody_bFiltro` / `#cpBody_bPaquetes` / `VerGuia()` inside PruebaExportacion.aspx | `audit/logs/evidence/prueba-grid-snapshot.json` (`hiddenSection`), recon HTML | Not a new URL — Rastreo's modal markup is embedded (hidden) in Prueba de Exportación; no separate route. |

## Notable non-findings / corrections to earlier phases

- **Prueba de Exportación "Imprimir" icons are enabled and work.** Phase 1/2 read the inline
  `ASPx.AddDisabledItems(...)` as a disabled state; at runtime no `dxbDisabled` class is present and
  all 4 rows (statuses "Entregado al Cliente" ×3, "Embarcado" ×1) return a valid 159 KB Air
  Waybill PDF named `<tracking>.pdf`. TB-10's "find why disabled" premise does not apply.
- **Estado PDF flow is functional** (3/3 invoices, `%PDF-1.7`, Crystal Reports, totals match
  the grid: FT33-006983 → RD$ 3,677.19). The DevExpress loading panel is shown during the ~4 s
  postback (BT-07 feedback exists).
- **Footer math on Estado is correct** (6,684.75 / 0.00 / 0.00 / 6,684.75 = sum of rows).
- **Sorting works** on every header of Estado (8/8) and Prueba (9/9) via callback, no errors.
- **Back after the PDF action** (NV-01) and **F5** (NV-03) restore Estado.aspx cleanly.
- **PagoOnline reachable by URL** despite the hidden sidebar `<li style="Display:none;">`
  (NV-06) — until the PO-01 trigger.
- Prueba/PreAlerta/PagoOnline grids use DevExpress adaptive mode at 375/768 (columns collapse
  into a "..." detail row; TB-06 verified at 768 and 375: expand 1st, 2nd, collapse — no error).
- PreAlerta textarea (`resize: vertical`) and inputs do not break layout with 100k chars.
- Console/network background noise: none with observable effect (session logs under
  `audit/logs/console/p4-docs-*.log`, `audit/logs/network/p4-docs-*.json`).

## Lessons (notes)

- `audit/notes/pagoonline-500-after-estado.md` — visit PagoOnline before Estado/MiCuenta in a session.
- `audit/notes/devexpress-adddisableditems-is-not-disabled.md` — style registration ≠ disabled state.
- `audit/notes/static-form-validation-without-submit.md` — `reportValidity()` + route/submit guards for STATIC-ONLY forms.
- `audit/notes/pdf-download-flows.md` — how Estado vs Prueba deliver PDFs and how to capture them.
- `audit/notes/tsx-evaluate-name-shim.md` (shared with micuenta) — `__name` shim for nested functions in `page.evaluate`.
