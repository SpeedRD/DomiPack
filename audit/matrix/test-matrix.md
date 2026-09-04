# Domipack Customer Portal — Test Matrix (Phase 3)

**Purpose:** A reusable-by-component-type test matrix for the audit. Cases are
organized by *component type* (text field, date range, select, table, button,
modal, navigation, …) rather than by screen, so each case can be applied to
every instance of that type found in `audit/inventory/components/*.json`. A
per-component-instance applicability map is at the end (§13).

**Category taxonomy (fixed):** `functional`, `server`, `validation`, `ux-ui`,
`responsive`, `accessibility`, `copy-content`, `robustness`. A case may carry
more than one tag.

**Scope guardrails (carried from Phase 1/2 — apply during Phase 4 execution):**
- 🚫 **Golden rule — no irreversible actions on real data.** The following
  submits are STATIC-INSPECTION-ONLY and must never be fired:
  - PreAlerta `Envia tu Factura` (`#cpBody_bSend`) — creates a real pre-alert + file upload.
  - PagoOnline `Pagar Con` (`#cpBody_bpagar`) and the hidden checkout sub-form,
    especially `#cpBody_bCheckOut` — real-money flow.
  - Nueva Cuenta `Submit` (`#bSend`) — creates a real customer account.
  - Mi Cuenta `Guardar` (`#cpBody_Button1`), `Agregar` dependiente
    (`#cpBody_Button3`), `Agregar Direccion` (`#cpBody_bDireccion`) — persist real account data.
  - Per-row PDF/print icons (Estado, Prueba de Exportación) — file-download side effect.
  - `Recuperar mi Contraseña?` on Login — likely sends a real email.
- For those, "submit" cases are still **listed** for coverage, but must be run
  as *client-side validation observation only* (fill + inspect client-side
  validation/UI, then abandon without triggering the server submit), or skipped.
  Each such case is tagged **[STATIC-ONLY]**.
- 🧭 **Session hazard:** revisiting `Login.aspx` / root `/` while authenticated
  kills that context's session. Any case that does this (or clicks `Salir`) must
  be the **LAST** case in its browser context. Tagged **[RUN-LAST]**.
- ✅ Parallel independent logins (separate contexts) are safe (confirmed Phase 2).

**How to read the tables:** `ID` is stable for cross-referencing in Phase 4
triage. `Applies to` names the component types/instances the case targets.
`Steps / input` is the action. `Expected / observe` is the pass criterion or the
thing to record. `Categories` are the taxonomy tags.

---

## 1. Text fields (generic free-text)

Instances: Login `#lUser`; Nueva Cuenta `#Identificacion`, `#Nombre`; Mi Cuenta
`#cpBody_lCodigo`, `#cpBody_lNombre`, `#cpBody_lRNC`, `#cpBody_lEmail` (plain
text), `#cpBody_lDireccion1/2`, `#cpBody_lTelefono/2`, `#cpBody_lCelular`,
dependiente `#cpBody_lNombreDependiente`/`#cpBody_lIdentificacionDependiente`/`#cpBody_lEmailDependiente`,
direccion `#cpBody_tbDireccion`, `#cpBody_tbNota`; PreAlerta `#cpBody_Tracking`,
`#cpBody_Suplidor`, `#cpBody_contenido` (textarea); PagoOnline hidden `#cpBody_nota`.

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| TF-01 | Any required text field | Leave empty, attempt to advance/submit (client-side only for [STATIC-ONLY] forms) | Field flagged as required with a clear, associated message; focus moves to it | validation, functional, ux-ui, accessibility |
| TF-02 | Any required text field | Enter whitespace-only (`"   "`) | Treated as empty / rejected, not accepted as valid content | validation, robustness |
| TF-03 | Any text field | Enter leading/trailing spaces around valid content (`"  Juan  "`) | Observe whether trimmed on submit/echo; document silent trimming vs. preservation | validation, functional |
| TF-04 | Any text field | Enter excessive length (e.g. 5,000 & 100,000 chars) | No crash/hang; graceful maxlength or server rejection; layout not broken | robustness, validation, server, ux-ui |
| TF-05 | Any text field | Enter special chars `< > " ' & % \ / ; { } | # =` and `<script>alert(1)</script>` (validation-check only, NOT exploitation) | Input either escaped/rejected cleanly or accepted-and-safely-echoed; no unhandled error, no raw HTML execution on echo | validation, robustness, server |
| TF-06 | Any text field | Enter Unicode / emoji / RTL / accented (`ñ á ü 你好 🚚 ‏rtl`) | Stored & displayed correctly; no mojibake / encoding error | robustness, validation, copy-content |
| TF-07 | Any text field | Enter SQL-ish / template-ish strings (`' OR 1=1 --`, `{{7*7}}`, `${x}`) as *validation* probes | Handled as literal text (rejected or safely stored); no server error, no evaluation | robustness, server, validation |
| TF-08 | Name/ID fields (`#Nombre`, `#Identificacion`, RNC, cédula) | Enter numbers in name / letters in ID / wrong-format cédula-RNC | Format validation present or documented absent; error message clarity | validation, functional, copy-content |
| TF-09 | Any text field | Paste (not type) a very long / multiline value | Same handling as typed; newlines in single-line fields handled | robustness, functional |
| TF-10 | Any labeled-by-placeholder field | Focus field, then blur with a value | Confirm the placeholder-only labeling gap: is there any persistent visible/AT label? (known gap on Login, Nueva Cuenta, PreAlerta) | accessibility, ux-ui |
| TF-11 | Textarea (`#cpBody_contenido`, `#cpBody_tbNota`) | Enter many newlines / very long paragraph | Scroll/resize behavior sane; no layout overflow | ux-ui, responsive, robustness |
| TF-12 | Disabled-on-load text fields (`#cpBody_ClienteID` PreAlerta, `#cpBody_lCodigo`?) | Attempt to type; inspect why disabled | Confirm disabled state is intended & explained to user (no silent lock) | ux-ui, functional, accessibility |

## 2. Email fields

Instances: Nueva Cuenta `#Email`, `#Email1` (both accept `;`-separated lists);
Mi Cuenta `#cpBody_lEmail` (plain text, not `type=email`), dependiente
`#cpBody_lEmailDependiente`.

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| EM-01 | Any email field | Empty when required | Required-validation fires with clear message | validation, functional, accessibility |
| EM-02 | Any email field | Invalid formats: `abc`, `abc@`, `@x.com`, `a b@x.com`, `a@x`, `a@@x.com`, trailing dot | Rejected with a specific error; observe client-side vs. server-side | validation, functional |
| EM-03 | Nueva Cuenta `#Email`/`#Email1` | Enter `;`-separated list per placeholder (`a@x.com;b@y.com`) and a malformed one (`a@x.com;;`, `a@x.com; ` ) | Multi-value parsing works as the placeholder claims; malformed member rejected | validation, functional, copy-content |
| EM-04 | `#Email` vs `#Email1` | Enter same address in both; enter overlapping lists | Document the redundant dual-field UX; any dedupe/conflict handling | ux-ui, functional, copy-content |
| EM-05 | Any email field | Excessive length local-part / domain (256+ chars, very long TLD) | Graceful handling, no crash | robustness, validation |
| EM-06 | Any email field | Whitespace-only; leading/trailing spaces around valid email | Trimmed or rejected, not accepted as-is | validation, robustness |
| EM-07 | Mi Cuenta `#cpBody_lEmail` | Confirm it's plain `text` not `type=email` | Note missing native email semantics (keyboard/AT/inline validation) | accessibility, ux-ui, validation |
| EM-08 | Any email field | Unicode/IDN email (`usuario@dominío.com`, `名@例.jp`) | Document accept/reject behavior | robustness, validation |

## 3. Phone fields

Instances: Nueva Cuenta `#ltelefono`, `#lcelular` (plain text, not `type=tel`,
load disabled); Mi Cuenta `#cpBody_lTelefono/2`, `#cpBody_lCelular`, dependiente
`#cpBody_lCelularDependiente` (placeholder shows `+99-99-9999-9999`).

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| PH-01 | Any phone field | Empty when required | Required-validation clarity | validation, functional |
| PH-02 | Any phone field | Letters / symbols (`abc`, `+++`, `()`) | Numeric/format validation present or documented absent | validation, functional |
| PH-03 | `#cpBody_lCelularDependiente` | Enter value NOT matching placeholder mask `+99-99-9999-9999` (e.g. `8091234567`, `123`) | Confirm no client-side mask/pattern enforced (per inventory note); document mismatch between promised format and actual acceptance | validation, ux-ui, copy-content |
| PH-04 | Any phone field | Excessive length (50+ digits); very short (1 digit) | Length bounds enforced or documented; no crash | validation, robustness |
| PH-05 | Any phone field | Whitespace-only; spaces/dashes within (`809 123 4567`, `809-123-4567`) | Document normalization behavior | validation, functional |
| PH-06 | Any phone field | Confirm plain `text` not `type=tel` | Note missing numeric keypad on mobile / AT semantics | accessibility, ux-ui, responsive |
| PH-07 | Nueva Cuenta phones (disabled on load) | Inspect enable trigger (Tipo de Cliente / Identificación dependency) | Document what enables them; whether the dependency is discoverable | functional, ux-ui |

## 4. Password fields

Instances: Login `#lPass`; Nueva Cuenta `#Password` (disabled on load); Mi Cuenta
`#cpBody_lContrasena` (optional change).

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| PW-01 | Login `#lPass` | Empty + submit | Required handling; error message; no silent no-op | validation, functional |
| PW-02 | Login `#lPass` | Wrong password (valid user) | Clear auth-failure message; no info leak (user-exists disclosure); field state after failure | validation, server, functional, copy-content |
| PW-03 | Any password field | Very long (10,000 chars) | No crash/hang | robustness, server |
| PW-04 | Any password field | Special chars / Unicode / whitespace-only / leading-trailing spaces | Accepted or rejected consistently; document trimming | robustness, validation |
| PW-05 | Nueva Cuenta `#Password`, Mi Cuenta `#cpBody_lContrasena` | Inspect for strength meter / min-length / policy hint | Document presence/absence of password-policy UX | ux-ui, copy-content, validation |
| PW-06 | Any password field | Check for show/hide (reveal) toggle & autocomplete attributes | Document reveal affordance & `autocomplete` correctness | ux-ui, accessibility |
| PW-07 | Mi Cuenta `#cpBody_lContrasena` [STATIC-ONLY] | Confirm optional (blank = no change) semantics without submitting | Document expected behavior; do NOT submit (writes account) | functional, ux-ui |

## 5. Date range fields

Instances: Rastreo "Historial Guías" modal `#cpBody_lDesde` (Fecha Desde) +
`#cpBody_lHasta` (Fecha Hasta), both `type=date`, with `Buscar` (`Filtro()`).
Also Nueva Cuenta `#tbFecha` (single date, `type=date`, disabled on load — treat
single-date cases DR-08..DR-10).

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| DR-01 | Desde/Hasta range | `Hasta` earlier than `Desde` (e.g. Desde=2026-06-01, Hasta=2026-01-01) → Buscar | Inverted-range rejected with clear message OR handled gracefully (no crash / no empty-confusing result) | validation, functional, robustness |
| DR-02 | Desde/Hasta range | Absurd range: Desde=1900-01-01, Hasta=2999-12-31 → Buscar | No timeout/crash; performance acceptable; result sane | robustness, server, functional |
| DR-03 | Desde/Hasta range | Both empty → Buscar | Defined behavior (all records / prompt / no-op), documented; not an error | functional, validation, ux-ui |
| DR-04 | Desde/Hasta range | Only Desde filled / only Hasta filled → Buscar | Partial-range behavior defined & sensible | functional, validation |
| DR-05 | Desde/Hasta range | Same date in both (single-day range) | Returns that day's records inclusively | functional |
| DR-06 | Desde/Hasta range | Future-only range (no possible data) | Empty-result state shown clearly (see also TB-01) | functional, ux-ui |
| DR-07 | Desde/Hasta range | Manually typed invalid date in `type=date` (browser-dependent), out-of-range day (2026-02-30) | Browser/native picker handling; server rejects impossible date | validation, robustness |
| DR-08 | Nueva Cuenta `#tbFecha` (DOB) | Future birth date; age < plausible (e.g. today); very old (1900) | Age/plausibility validation present or documented absent | validation, functional |
| DR-09 | Any date field | Confirm `type=date` native picker keyboard accessibility & label association | Document AT/label state | accessibility, ux-ui |
| DR-10 | Historial modal | Verify the stray literal text `"gv"` rendered between Hasta and Buscar (known Phase 1 glitch) | Confirm the rendering bug still present; capture | ux-ui, copy-content |

## 6. Selects / dropdowns (single-level)

Instances: Nueva Cuenta `#ddTipo` (Tipo Cliente), `#sSexo`, `#lSucursal` (long
branch list), `#cbMedioiD`; Mi Cuenta `#cpBody_lSucursal` (disabled), PreAlerta
`#cpBody_Transpos` (carrier); PagoOnline hidden `#cpBody_Direcciones`.

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| SL-01 | Any required select | Leave on placeholder ("Seleccionar") + submit | Required-validation fires (placeholder ≠ valid selection) | validation, functional |
| SL-02 | `#sSexo`, `#ddTipo` | Select each option; observe dependent field enable/disable | Correct fields enable per selection (esp. `#ddTipo` → Personal/Empresa/Extranjero gating of disabled fields) | functional, ux-ui |
| SL-03 | Long lists (`#lSucursal`, `#cbMedioiD`) | Open; scan for search/typeahead; measure list length | Document usability of long native selects (no search) | ux-ui, accessibility, responsive |
| SL-04 | Disabled selects (Mi Cuenta `#cpBody_lSucursal`, Direccion `#cpBody_cbPais`/`#cpBody_cbProvincia`) | Confirm disabled; look for explanation | Document silent lock with no tooltip/reason (known gap) | ux-ui, accessibility, functional |
| SL-05 | Any select | Keyboard-only operation (Tab, arrows, type-ahead) & AT label | Fully operable & labeled | accessibility |
| SL-06 | `#cbMedioiD` ("how did you hear") | Read all option copy | Flag odd/dated/duplicated option copy for redesign | copy-content, ux-ui |
| SL-07 | Any select | Programmatically inject an out-of-list value (validation probe) then submit-attempt | Server rejects unknown option; no crash | robustness, server, validation |

## 7. Dependent / cascading selects

Instances: Mi Cuenta Direccion tab `#cpBody_cbPais` → `#cpBody_cbProvincia` →
`#cpBody_cbCiudad` → `#cpBody_cbSector` (Pais & Provincia load disabled for the
test account; Ciudad/Sector empty until parent changes). Also potential
Nueva Cuenta `#ddTipo`-gated fields (functional dependency, §6 SL-02).

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| DS-01 | Ciudad without Provincia | Attempt to select `#cpBody_cbCiudad` while Provincia unset/disabled | Second level correctly empty/disabled until parent chosen; no error | functional, validation, ux-ui |
| DS-02 | Sector without Ciudad | Same for `#cpBody_cbSector` (3rd level) | Deeper level gated on its parent | functional, validation |
| DS-03 | Change parent after choosing child | Pick Provincia→Ciudad→Sector, then change Provincia | Child selects reset/repopulate correctly; no stale value persists | functional, robustness, ux-ui |
| DS-04 | Cascade repopulation | Change parent, observe network/AJAX to fill children | Loading state shown; no double-fill; no race if changed rapidly | functional, server, ux-ui |
| DS-05 | Rapid parent switching | Change Provincia several times quickly | No race condition / mismatched child list; last selection wins | robustness, functional |
| DS-06 | Locked cascade (this account) | Confirm Pais/Provincia disabled blocks the whole cascade | Document that the cascade is untestable-as-user here + why (needs an account that can edit address) | functional, ux-ui |
| DS-07 | Cascade rendering | Verify Provincia/Ciudad/Sector "solid-color box / invisible label" rendering bug (Phase 1) | Confirm & capture the visual/label defect | ux-ui, accessibility, copy-content |

## 8. Tables / listings / grids

Instances (all DevExpress): Estado `#cpBody_gvDatos` (invoices, 3 rows + totals
footer); Rastreo `#cpBody_gvDatos` (grouped-by-status, collapsible); Prueba de
Exportación `#cpBody_gvDatos`; Mi Cuenta `#cpBody_gvDependientes` (empty),
`#cpBody_gvDireccion` (empty); PagoOnline `#cpBody_gvDatos` (1 pre-selected row);
Adjuntos `#gvDatos` (empty); Rastreo modals detail grids.

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| TB-01 | Empty grids (Dependientes, Direccion, Adjuntos, PreAlerta) | View empty state | Clear empty-state messaging; current "No data to display" is DevExpress default — flag copy/UX | ux-ui, copy-content, functional |
| TB-02 | Filterable grids (Historial via date range; any grid with filter row) | Apply a filter that matches nothing | Distinct "no results for filter" state vs. "no data at all"; easy filter reset | functional, ux-ui, copy-content |
| TB-03 | Any grid | High volume (account/period with many rows) — if a high-volume account/date range is available | Pagination or virtual scroll present; no freeze; render time acceptable | robustness, functional, server, responsive |
| TB-04 | Estado, Prueba, Rastreo grids | Confirm absence of filter/search/pagination for small datasets | Document missing filter/pager (known gap on Estado); note re-check needed with a larger account | functional, ux-ui |
| TB-05 | Grouped grid (Rastreo, grouped-by-status) | Expand/collapse group headers; collapse all | Toggle works; state consistent; keyboard operable | functional, ux-ui, accessibility |
| TB-06 | Row-detail expander (`DXCBtn1` "..." on Rastreo/Prueba) | Expand a row; expand multiple; collapse | Inline master-detail opens correctly; multiple expansions OK; no layout break | functional, ux-ui |
| TB-07 | Any grid | Horizontal overflow of wide columns at 375/768px | Grid scrolls/reflows without breaking page layout | responsive, ux-ui |
| TB-08 | Any grid | Screen-reader table semantics (header association, group rows, empty row) | Proper `th`/scope/roles; group & footer rows announced sanely | accessibility |
| TB-09 | Estado totals footer / PagoOnline footer | Verify footer math vs. visible rows | Totals correct & clearly labeled (e.g. `DOP$: 0.000` formatting) | functional, copy-content, ux-ui |
| TB-10 | Prueba `Imprimir` disabled icons | Confirm disabled per-row print; find the reason | Document why some rows can't print (status-tied?); disabled affordance clarity | functional, ux-ui |
| TB-11 | PagoOnline grid pre-selected row [STATIC-ONLY] | Observe the pre-selected row & footer total without triggering pay | Document pre-selection behavior; do NOT proceed to Pagar | functional, ux-ui |
| TB-12 | Sortable columns (if headers sort) | Click headers to sort asc/desc; sort empty grid | Sort works; stable; no error on empty | functional, robustness |

## 9. Action buttons

Instances: Login `Entrar` (`<a onclick=login()>`), `Recuperar` [STATIC-ONLY],
`Crear Cuenta Gratis`; Nueva Cuenta `#bSend` [STATIC-ONLY]; Mi Cuenta `#cpBody_Button1`/`Button3`/`bDireccion` [STATIC-ONLY]; PreAlerta `#cpBody_bSend` [STATIC-ONLY];
PagoOnline `#cpBody_bpagar`/`#cpBody_bCheckOut` [STATIC-ONLY]; Rastreo `Buscar`,
`Menu` toggle; per-row PDF icons [STATIC-ONLY]; shared `Salir` [RUN-LAST].

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| BT-01 | Non-destructive submit buttons (Login `Entrar`, Rastreo `Buscar`) | Double-click / rapid multi-click | No double submission / duplicate request; button disabled or debounced during processing | functional, robustness, server |
| BT-02 | Destructive submits [STATIC-ONLY] (`#bSend`, Mi Cuenta saves, PreAlerta, checkout) | Inspect statically for double-submit protection & confirm-dialog presence | Document whether a confirm step / disable-on-click exists — WITHOUT firing | functional, robustness, ux-ui |
| BT-03 | Any submit form | Click submit with required fields empty | Validation blocks submit; focus & messaging correct (client-only for [STATIC-ONLY]) | validation, functional, accessibility |
| BT-04 | Login `Entrar` | Click, then immediately navigate away / click again during the 4–20s "Loading…" delay | No broken state; no duplicate login; intermediate loading state is communicated to the user (currently only a `document.title` change) | robustness, functional, ux-ui |
| BT-05 | Login `Entrar` (`<a href="#" onclick>`) | Keyboard: focus + Enter/Space; check it's reachable & has role/name | Not a real `<button>`/submit — verify keyboard operability & accessible name | accessibility, functional |
| BT-06 | Icon-only buttons (sidebar collapse, mobile toggle, user-menu trigger, per-row icons) | Inspect accessible name (aria-label/text) | Document missing accessible names (known gaps) | accessibility, ux-ui |
| BT-07 | Any button | Loading/disabled feedback after click | User gets visible feedback (spinner/disable); no "did it work?" ambiguity | ux-ui, functional |
| BT-08 | `Salir` (logout) [RUN-LAST] | Click; verify redirect to Login.aspx & session end | Logout works; **schedule LAST** in that context (kills session) | functional, robustness |
| BT-09 | PagoOnline `Pagar Con` [STATIC-ONLY] | Static-inspect only (Phase 1: opened empty dropdown) | Confirm empty-dropdown behavior via DOM; do NOT proceed | functional, ux-ui |
| BT-10 | `Crear Cuenta Gratis`, dead footer links | Click nav-only links; check footer links (`href=""`) | `Crear Cuenta` navigates; footer T&C/Privacy/Delivery links confirmed dead (known gap) | functional, copy-content, ux-ui |
| BT-11 | Any button | Focus-visible outline & tab order | Visible focus ring; logical tab order | accessibility, ux-ui |

## 10. Modals / dialogs

Instances: Rastreo "Historial Guías" `#modal_Historial` (Bootstrap `modal-full`,
has `×`); Rastreo "Movimientos del Paquete" (VerGuia, no captured close button —
Esc-dismissed); Rastreo `Menu` dropdown; user-menu dropdown; Adjuntos popup
window (`dlg/Adjuntos.aspx`).

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| MD-01 | Any modal | Open then close via `×` without completing | Closes cleanly; underlying state unchanged; scroll not locked | functional, ux-ui |
| MD-02 | Any modal | Click outside (backdrop) | Document whether it dismisses; consistency across modals | functional, ux-ui |
| MD-03 | Any modal | Press `Esc` | Dismisses (Movimientos relies on this — verify it's the ONLY way & discoverable) | functional, accessibility, ux-ui |
| MD-04 | Movimientos modal | Look for a visible close (X) affordance | Confirm missing visible close button (known gap) — Esc-only is an a11y/UX risk | ux-ui, accessibility |
| MD-05 | Any modal | Double-open (trigger twice rapidly) | No duplicate/stacked modals; single instance | robustness, functional |
| MD-06 | Historial modal | Verify title overlaps top nav bar (z-index/position bug) & `modal-full` layout at 375/768/1440px | Confirm known overlap bug; check responsive behavior | ux-ui, responsive |
| MD-07 | Any modal | Focus trap & focus return | Focus trapped within modal while open; returns to trigger on close | accessibility |
| MD-08 | Any modal | Open modal, submit its action (Buscar — non-destructive), observe result rendering in-modal vs page | Result state handled; modal not left in limbo | functional, ux-ui |
| MD-09 | Adjuntos popup window | Open the `dlg/Adjuntos.aspx` popup; blocked-popup handling | Popup blockers handled gracefully; empty-state shown; window sizing sane | functional, robustness, ux-ui |
| MD-10 | Menu / user dropdowns | Open, click-outside to close, keyboard (Esc/arrows), double-open | Standard dropdown a11y & dismissal behavior | accessibility, functional, ux-ui |

## 11. Navigation, history & session

Applies across all authenticated screens + shared sidebar/chrome.

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| NV-01 | Any form/flow | Perform a meaningful (non-destructive) action, then browser Back | State restored sanely; no resubmission prompt loop; no broken page | robustness, functional |
| NV-02 | Any form/flow | Back then Forward after an action | Consistent state; no duplicate side effects | robustness, functional |
| NV-03 | Any multi-step/tabbed flow (Mi Cuenta tabs, filled forms) | Refresh (F5) mid-flow with unsaved input | Document data loss vs. preservation; no error page | robustness, functional, ux-ui |
| NV-04 | Mi Cuenta hash tabs | Deep-link/refresh on a non-default tab (`#...tab2`) | Correct tab restored on reload, or documented reset to default | functional, ux-ui |
| NV-05 | Any protected screen | Direct URL to an intermediate/protected step while unauthenticated | Redirect to Login (verified pattern) — reconfirm for each; no partial render leak | server, functional, robustness |
| NV-06 | Hidden routes | Direct URL to `PagoOnline.aspx` (sidebar hidden) & hidden `Tarjetas Registradas` tab | Document reachability-by-URL of UI-hidden features (access-control/UX concern) | functional, robustness, ux-ui |
| NV-07 | Adjuntos dialog | Direct URL to `dlg/Adjuntos.aspx?...` with missing/garbage `cl`/`c` params | Graceful handling of missing/invalid params; no error dump | robustness, server, validation |
| NV-08 | Post-login landing | After login, verify redirect to Rastreo.aspx; interrupt during the 4–20s loading window (see BT-04) | Landing robust to interruption | robustness, functional |
| NV-09 | Sidebar active-state | Navigate each sidebar item; verify `mm-active` reflects current page | Active nav indicator correct on every screen | functional, ux-ui |
| NV-10 **[RUN-LAST]** | **Session self-invalidation** — confirmed Phase 2 | In an authenticated context: navigate to `Login.aspx` (or `/`), then attempt any protected page (e.g. Rastreo.aspx) | Confirm the session is now dead (redirected back to Login). **This case KILLS the context's session — it MUST be the LAST case executed in whichever browser context runs it.** Also reachable via `Salir` (BT-08). Run in a dedicated/disposable context so it doesn't block other cases. | robustness, server, functional |
| NV-11 | Concurrency (design-around, confirmed safe) | Two independent contexts log in with the same account in parallel | Both stay authenticated (confirmed Phase 2) — used as the harness assumption for parallel subagents, re-verify once at Phase 4 start | robustness, server |
| NV-12 | Any screen | Idle for an extended period, then act (session timeout) | Timeout handled with a clear re-login prompt, not a broken action | robustness, server, ux-ui |

## 12. Cross-cutting: responsive, accessibility, copy/content

| ID | Applies to | Steps / input | Expected / observe | Categories |
|---|---|---|---|---|
| RS-01 | Every main screen (Login, Nueva Cuenta, Mi Cuenta ×3 tabs, Estado, Rastreo, Prueba, PreAlerta, PagoOnline) | Render at **375px** (mobile) | No horizontal scroll of page body; content reflows; mobile nav toggle works; tap targets ≥ adequate size | responsive, ux-ui |
| RS-02 | Every main screen | Render at **768px** (tablet) | Layout adapts; sidebar/hamburger behavior correct; grids scroll not break | responsive, ux-ui |
| RS-03 | Every main screen | Render at **1440px** (desktop) | Layout uses space sanely; no ultra-wide stretch/blank issues | responsive, ux-ui |
| RS-04 | Grids & modals | At 375/768: DevExpress grids and `modal-full` | Grids get horizontal scroll container; modals fit viewport (see MD-06) | responsive, ux-ui |
| RS-05 | Mobile nav toggle (`mobile-toggle-nav`) | At 375/768: open/close sidebar via hamburger | Toggle reveals nav (untested in prior phases); operable & labeled | responsive, functional, accessibility |
| AX-01 | Login, Nueva Cuenta, Mi Cuenta, Estado, Rastreo, Prueba, PreAlerta, PagoOnline | Run **axe-core** on each main screen | Record all violations (contrast, labels, roles, landmarks, names); prioritize in triage | accessibility |
| AX-02 | All placeholder-only-labeled fields | axe + manual: label association | Confirm missing `<label for>`/`aria-label` gaps (Login, Nueva Cuenta, PreAlerta, Mi Cuenta) | accessibility, ux-ui |
| AX-03 | Icon-only controls | axe + manual: accessible names | Confirm missing names (sidebar collapse, user menu, per-row icons) | accessibility |
| AX-04 | Every screen | Keyboard-only full traversal (Tab order, focus visibility, no traps except modals) | Complete keyboard operability; logical order | accessibility |
| AX-05 | Every screen | Color-contrast of text, disabled fields, the solid-color-box selects | Contrast meets WCAG AA; disabled ≠ invisible | accessibility, ux-ui |
| CC-01 | Every screen | Review visible copy for spelling/grammar/consistency (mixed accents: "Direccion" vs "Dirección", "Telefono", "Exportacion") | Flag inconsistent/missing accents & terminology for redesign | copy-content, ux-ui |
| CC-02 | Rastreo Historial modal | The stray `"gv"` literal (DR-10) | Flag as leaked control ID rendered as content | copy-content, ux-ui |
| CC-03 | Error/empty/loading messages | Collect all messages surfaced by validation/empty/timeout cases | Assess clarity, tone, language consistency (Spanish), actionability | copy-content, ux-ui |
| CC-04 | Footer | `2022 - DOMIPACK...` + dead links | Flag stale year & dead legal links (T&C/Privacy/Delivery) | copy-content, ux-ui, functional |
| CC-05 | Nueva Cuenta unlabeled checkboxes (`#ckDomicilio`, `#ckRua`) | Inspect for meaning/label | Flag unlabeled checkboxes needing explanatory copy | copy-content, accessibility, ux-ui |
| CB-01 | Checkboxes (Login `#checkbox-signup` "remember me", Direccion `#cpBody_ckPrincipal`, `#ckDomicilio`, `#ckRua`) | Toggle; observe effect; default state | Document actual effect (remember-me behavior unverified) & default-checked correctness | functional, ux-ui, accessibility |
| FU-01 | File upload (PreAlerta `#cpBody_File1`) [STATIC-ONLY] | Inspect accepted types, size limit, multiple; select a file WITHOUT submitting | Document client-side file constraints & feedback; do NOT submit (destructive) | functional, validation, ux-ui |

---

## 13. Applicability map (component instance → case groups)

| Screen | Component instances | Case groups |
|---|---|---|
| **Login** | `#lUser` (text), `#lPass` (pwd), `#checkbox-signup`, `Entrar`, `Recuperar`[STATIC], `Crear Cuenta` | TF-*, PW-01/02/06, CB-01, BT-01/04/05/10, NV-05/08, NV-10[RUN-LAST], RS-*, AX-*, CC-* |
| **Nueva Cuenta** | `#ddTipo`,`#sSexo`,`#lSucursal`,`#cbMedioiD` (selects), `#Identificacion`/`#Nombre` (text), `#Email`/`#Email1`, `#ltelefono`/`#lcelular`, `#Password`, `#tbFecha`, `#ckDomicilio`/`#ckRua`, `#bSend`[STATIC] | TF-*, EM-*, PH-*, PW-03/04/05, SL-01/02/03/06/07, DR-08, CB-01, CC-05, BT-02/03[STATIC], RS-*, AX-* |
| **Mi Cuenta — Datos Personales** | text fields, `#cpBody_lEmail`, phones, `#cpBody_lContrasena`, `#cpBody_lSucursal`(disabled), `#cpBody_Button1`[STATIC] | TF-*, EM-07, PH-*, PW-07[STATIC], SL-04, TF-12, BT-02/03[STATIC], NV-03/04, RS-*, AX-* |
| **Mi Cuenta — Dependientes** | name/cédula/email/celular fields, `#cpBody_Button3`[STATIC], `#cpBody_gvDependientes`(empty) | TF-*, EM-*, PH-03, TB-01/08, BT-02/03[STATIC], AX-* |
| **Mi Cuenta — Direccion** | `#cpBody_cbPais/cbProvincia/cbCiudad/cbSector` (cascade, some disabled), `#cpBody_tbDireccion/tbNota`, `#cpBody_ckPrincipal`, `#cpBody_bDireccion`[STATIC], `#cpBody_gvDireccion`(empty) | DS-*, SL-04/05, TF-11, CB-01, TB-01, BT-02/03[STATIC], AX-05, DS-07 |
| **Estado de Cuenta** | `#cpBody_gvDatos` (invoices), per-row PDF[STATIC], footer totals | TB-01/03/04/07/08/09/12, TB-10-style, NV-01/03, RS-*, AX-* |
| **Rastreo** | grid (grouped), tracking link→Movimientos modal, Menu→Historial modal (date range), Adjuntos popup, row expander, `Buscar` | TB-05/06/07/08, DR-01..DR-07/DR-10, MD-*, BT-01/06, NV-01/02/06/07, RS-*, AX-*, CC-02 |
| **Prueba de Exportación** | `#cpBody_gvDatos`, `Imprimir`(disabled)[STATIC], row expander | TB-01/03/04/06/07/08/10/12, RS-*, AX-* |
| **PreAlerta** | `#cpBody_Tracking`,`#cpBody_Suplidor`,`#cpBody_contenido`, `#cpBody_FOB`(number), `#cpBody_Transpos`(select), `#cpBody_File1`(file)[STATIC], `#cpBody_bSend`[STATIC], grid(empty) | TF-*, TF-11, SL-01/07, FU-01[STATIC], TB-01, BT-02/03[STATIC], RS-*, AX-* |
| **PagoOnline** [mostly STATIC] | grid(pre-selected), `Pagar Con`[STATIC], hidden checkout sub-form (`#cpBody_bCheckOut` etc.)[STATIC] | TB-11[STATIC], BT-09[STATIC], NV-06, RS-*, AX-* (static/observational only) |
| **Shared chrome** | sidebar collapse, mobile toggle, user-menu, `Salir`, footer | BT-06/08[RUN-LAST], MD-10, NV-09, RS-05, AX-03, CC-04 |

### Number field (PreAlerta `#cpBody_FOB`, `type=number`)
Reuse TF-01/02/04 plus: NM-01 negative value; NM-02 zero; NM-03 non-numeric via
paste; NM-04 excessive magnitude / decimals / scientific notation; NM-05
currency-format expectations vs. raw number. (Tags: validation, functional,
robustness.)

---

## 14. Execution notes for Phase 4 (not part of the matrix itself)

- Assign each browser context a screen or component group; run independent
  contexts in parallel (safe per Phase 2).
- Within any context, order cases so **NV-10 / BT-08 (session-kill) run LAST**.
- Never fire **[STATIC-ONLY]** submits; fill-and-inspect client validation, then
  abandon.
- Capture per case: screenshot, console log, network log, axe output where
  relevant — reuse the existing `audit/support/capture.ts` harness.
- Coverage-first: every case above is listed regardless of expected severity;
  triage/prioritization happens in Phase 4, not here.
