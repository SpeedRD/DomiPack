# Phase 4 — group `micuenta` (Mi Cuenta ×3 tabs + shared chrome)

Executed 2026-09-03 against https://clientes.domipack.com with account DP-014003, one independent
Playwright context per script (each with its own login). Case-level log: `micuenta.jsonl` (233 rows).
Findings: `audit/findings/partial/micuenta.json` (MC-01..MC-19, SH-01..SH-06; `patron_relacionado` left null for the coordinator, pattern hints appended to `info_tecnica`). Screenshot per finding at `audit/screenshots/<id>.png` — MC-07, MC-18 and SH-05 are copies of MC-06.png, rs-micuenta-dependientes-375.png and SH-nv06-tarjetas-tab.png respectively.

Hard rules honoured: `#cpBody_Button1`, `#cpBody_Button3`, `#cpBody_bDireccion` (and the hidden submits
`#cpBody_Button2/Button6/Button4/BVerificar/SetCliente`) were never clicked; Enter was never pressed inside
the forms; Pais/Provincia were never re-enabled; the only `Login.aspx` navigation was `Salir` as the last action
of its own context (`shared-bt08-last.ts`); PagoOnline.aspx received exactly one GET.

## Scripts (`audit/scripts/phase4/`)
| script | session log name | purpose |
|---|---|---|
| `micuenta-recon.ts` | p4-micuenta-recon | DOM/validator/handler reconnaissance, saved page HTML |
| `micuenta-datos-fields.ts` | p4-micuenta-datos | Datos Personales: TF-*, EM-07, PH-*, PW-03..07, SL-04/05, TF-12, BT-02/03/07/11, CC-01/03 |
| `micuenta-dependientes.ts` | p4-micuenta-dependientes | Dependientes: TF-*, EM-*, PH-*, TB-01/08/12, BT-02/03, AX-02/04, CC-01 |
| `micuenta-direccion.ts` | p4-micuenta-direccion | Direccion: DS-01..07, SL-04/05, TF-11, CB-01, TB-01/08, BT-02/03, AX-05, CC-01 |
| `micuenta-nav.ts` | p4-micuenta-nav | NV-01/02/03/04, NV-06 (Tarjetas tab hash + reveal, PagoOnline single GET) |
| `micuenta-responsive-axe.ts` | p4-micuenta-rs-axe | RS-01/02/03 ×3 tabs, RS-05, AX-01/02/04/05 |
| `micuenta-focus-check.ts` | p4-micuenta-focus | BT-11/AX-04 re-measure after CSS transitions + user-menu keyboard reachability |
| `micuenta-extras.ts` | p4-micuenta-extras | finding screenshots by id, avatar/hidden-control/viewport checks |
| `shared-chrome.ts` | p4-shared-chrome | BT-06, AX-03, MD-10, CC-04/BT-10, sidebar collapse (BT-07) |
| `shared-nv09-active-state.ts` | p4-shared-nv09 | NV-09 on MiCuenta/Estado/Rastreo/PruebaExportacion/PreAlerta |
| `shared-bt08-last.ts` | p4-shared-bt08 | NV-12 (9 min idle) then BT-08 `Salir` — LAST action of that context |
| `micuenta-log-omitted.ts` | — | bookkeeping: logs Datos BT-06 and Dependientes AX-03 as omitted (no browser) |
| `_micuenta-common.ts` | — | helpers: probe(), contrast(), focused(), openTab(), log() |

## Per-screen counts (rows of `micuenta.jsonl`; "executed" = pass + fail + executed-static)
| screen | applicable (logged) | executed | passed | failed | executed-static | omitted | distinct cases |
|---|---|---|---|---|---|---|---|
| Mi Cuenta > Datos Personales | 109 | 106 | 5 | 19 | 82 | 3 | 43 |
| Mi Cuenta > Dependientes | 65 | 62 | 2 | 15 | 45 | 3 | 40 |
| Mi Cuenta > Direccion | 30 | 27 | 0 | 17 | 10 | 3 | 26 |
| Mi Cuenta > Tarjetas Registradas (hidden) | 1 | 1 | 0 | 0 | 1 | 0 | 1 |
| Shared chrome | 28 | 28 | 8 | 19 | 1 | 0 | 12 |
| **Total** | **233** | **224** | **15** | **70** | **139** | **9** | — |

Notes on counting: rows are case × instance (e.g. TF-04 logged once per text field). `executed-static` is the
STATIC-ONLY protocol (fill + inspect client-side + abandon) required for the three persisting forms; it is
not a skip. Two AX-04/BT-11 rows from `micuenta-responsive-axe.ts` were superseded by the
`CORRECTION` rows from `micuenta-focus-check.ts` (see lessons).

## Omitted (9) — with reasons
| screen | case | instance | reason |
|---|---|---|---|
| Datos Personales | TF-11 | n/a | no textarea on this tab |
| Datos Personales | SL-05 | #cpBody_lSucursal | disabled for this account: not focusable/operable by design |
| Datos Personales | BT-06 | #cpBody_Button1 | not icon-only (value="Guardar"); icon-only controls covered under Shared chrome |
| Dependientes | TF-11 | n/a | no textarea |
| Dependientes | TF-12 | n/a | no disabled-on-load field |
| Dependientes | AX-03 | n/a | no icon-only controls in the tab (empty grid renders no row icons); shared-chrome icons covered under Shared chrome AX-03 |
| Direccion | DS-03 | Provincia→Ciudad→Sector | Pais/Provincia disabled; their onchange is a full `__doPostBack`, re-enabling via DevTools could persist state (DS-06 documents) |
| Direccion | DS-04 | idem | idem |
| Direccion | DS-05 | idem | idem |

## Findings produced
| id | sev | one line |
|---|---|---|
| MC-01 | mayor | Visible labels never associated (no for/id); 5 selects without accessible name (axe select-name) |
| MC-02 | menor | Codigo/Sucursal/Pais/Provincia locked with no explanation |
| MC-03 | mayor* | Email/phone fields are plain `type=text`; every invalid format accepted client-side |
| MC-04 | mayor* | Password change: no policy, no confirm, no reveal, no `autocomplete=new-password`, no "blank keeps current" hint |
| MC-05 | menor* | Save buttons: no confirm / disable-on-click / loading feedback; unused `Confirmar()` helper |
| MC-06 | mayor* | Zero client-side validation (no required/maxlength/pattern, no Page_Validators) in all 3 forms |
| MC-07 | menor* | Single page form: Enter would trigger hidden master-page submit `#SetCliente` |
| MC-08 | mayor | No visible focus indicator on sidebar links, hamburger, footer links; Guardar shadow spread 0 |
| MC-09 | menor | Copy: "Personal Detalles", "Actualiza tu Datos", missing accents, `lang=en`, Guardar vs Agregar |
| MC-10 | menor | Dependiente celular placeholder promises `+99-99-9999-9999` mask, nothing enforced |
| MC-11 | menor | Empty grids show DevExpress English "No data to display" |
| MC-12 | menor | Grids: `<td>` headers, 8 nested tables, no caption/role |
| MC-13 | mayor | Direccion selects render as solid red boxes; Ciudad/Sector enabled-but-empty; 2.11:1 on disabled |
| MC-14 | mayor* | Address form cannot be completed (cascade locked at Pais/Provincia) and no message |
| MC-15 | menor | Checkbox Principal with `form-control` → 300×38 px box, label not clickable |
| MC-16 | mayor | Contrast failures: tabs 2.82, footer 2.72, subtitle 2.98, header email 2.36, sidebar 4.14, buttons 4.15@12.8px |
| MC-17 | menor | Tabs ignore the URL hash; deep link and F5 always reset to Datos Personales |
| MC-18 | mayor | Horizontal overflow at 375 (398/609/534 px) and 768 (823 px); tiny header tap targets |
| MC-19 | mayor | axe: 7–9 rules per tab incl. critical button-name/select-name, `user-scalable=no`, no main/h1, tabindex=8 |
| SH-01 | menor | Hamburger / mobile toggles work but have no accessible name or aria-expanded |
| SH-02 | mayor | User-menu trigger `<a>` without href: not keyboard-focusable, no name, broken avatar, Esc does not close → `Salir` unreachable by keyboard |
| SH-03 | menor | Footer: year 2022, legal links `href=""` reload the page, third-party card-logo image, 2.72:1 |
| SH-04 | menor | Sidebar active state wrong on Estado (none), PruebaExportacion (Rastreo), PagoOnline (none) |
| SH-05 | menor* | CSS-only hidden features reachable: Tarjetas Registradas tab, PagoOnline.aspx, hidden submit buttons, TokenID test value in DOM |
| SH-06 | menor | Sidebar collapse state not persisted across navigation |

`*` = `impacto_a_confirmar: true` (client-side/static evidence only; server behaviour not exercised).

## Sitemap / inventory additions (evidence-based, no exploration beyond one GET)
- **MiCuenta.aspx hidden controls (DOM, `style="display:none"` ancestors):** `#cpBody_lIdentificacion` ("Cedula/Pasaporte", placeholder "Nombre"), `#cpBody_ckConsolidation`, `#cpBody_lCupon` + `#cpBody_BVerificar` "Canjear Cupon", `#cpBody_Button2` "Agregar Dependiente", `#cpBody_Button6` "Agregar Direccion", `#cpBody_Button4` "Agregar Tarjeta" (inside the hidden tab), postback relays `#cpBody_bGuardarClientes`, `#cpBody_BGuardarDependientes`, `#cpBody_bEditar`, `#cpBody_BEliminar1` (driven by inline `Guardar()`, `GuardarDependiente()`, `Editar(s)`, `Eliminar(s)` — the latter uses `confirm('Desea Eliminar el Dependiente?')`), hidden inputs `#cpBody_TokenID` = `GB123456789.101112131415`, `#cpBody_ClienteID`, `#cpBody_DireccionID`, `#cpBody_DependienteId`, plus master-page `#lsClienteID` / `#SetCliente`. Evidence: `audit/logs/evidence/micuenta-recon-page.html`, `MC-extras.json`.
- **Inventory corrections:** `#cpBody_Button3` value is "Guardar Dependiente" (inventory said "Agregar"); `#cpBody_bDireccion` value is "Guardar Direccion"; `#cpBody_tbNota` is an `<input type=text>`, not a textarea (matrix TF-11 assumption); `#cpBody_lCodigo` is `readonly` (inventory "presumed").
- **Tarjetas Registradas tab** renders fully (grid `#cpBody_gvTarjetas` with columns Borrar / Tarjeta Numero / Marca / Fecha EXP, DevExpress popup `#cpBody_ppDelCard` 400×400) — only the `<li>` is hidden.
- **PagoOnline.aspx** (single GET): 200, renders "Pagos En Linea … PAQUETES DISPONIBLES … Pagar Con" with one package row; sidebar item hidden; no active sidebar state.
- Third-party/mixed content on every authenticated page: `http://maps.google.com/maps/api/js?sensor=true` (blocked as mixed content — console error on each load, no visible effect on these screens); footer image from `https://tainoexpress.com`; avatar from `lh3.googleusercontent.com/proxy/…` (fails to load).

## Notable non-findings / passes
- NV-12: 9 minutes idle → tab switch and reload still authenticated (no timeout observed within the bounded window; server timeout is longer than 9 min).
- BT-08: `Salir` → `Login.aspx`; subsequent `MiCuenta.aspx` → 302 → `Login.aspx` (session ended). Mechanism is purely client-side (`window.location.href='/Login.aspx'`), no logout endpoint; `ASP.NET_SessionId` cookie value unchanged (server-side abandon only). Recorded as info, not a finding.
- NV-01/NV-02: Back/Forward around a tab switch is clean (no resubmission prompt, no error); unsaved dependiente text was restored by the browser on Forward; tab clicks do not create history entries.
- NV-03: F5 silently discards unsaved input (no beforeunload); no error page. Logged as pass (documented data loss).
- TB-12: header click on the empty Dependientes grid → no request, no error (headers have pointer cursor but sorting is inert on empty data).
- CB-01: checkbox toggles correctly client-side (no handlers, no request); restored to unchecked.
- TF-04/TF-09: 100 000-char values accepted in ~12 ms with no layout overflow; pasted newlines stripped by the browser.
- RS-05: mobile nav toggle and header toggle work at 375/768 (sidebar slides in, `sidebar-mobile-open`).
- No HTTP ≥400 in any of the 11 sessions; console noise limited to mixed-content errors (maps.google.com http script blocked; jQuery 1.7.1 http on Login) and 14 `<g> attribute transform: scale(NaN)` SVG errors during viewport resizing (hamburger icon animation; no visible impact).

## Lessons (also in `audit/notes/`)
- `tsx-evaluate-name-shim.md` — `__name is not defined` inside `page.evaluate` when the callback declares named const arrows; fixed with `context.addInitScript('window.__name = (f) => f;')`.
- `focus-styles-read-mid-transition.md` — Bootstrap `.form-control` has a 150 ms transition; reading computed focus styles right after `Tab` yields transparent shadows and false "no focus indicator" results. Wait ≥400 ms, and treat `box-shadow … 0px 0px 0px 0px` spread as invisible.
- `micuenta-enter-implicit-submit.md` — the whole authenticated page is one form whose first submit is the hidden master-page `#SetCliente`; never press Enter in these forms during the audit.
- `micuenta-hidden-tab-reveal.md` — `$().tab` is unavailable (Bootstrap bundled in main.js with a private jQuery); revealing a hidden Bootstrap tab client-side = clear `li.style.display` + click; deep-link hashes are ignored.
- `salir-is-client-redirect.md` — logout is only a client redirect to Login.aspx whose Page_Load abandons the session; cookie survives.
