# Domipack Customer Portal — Site Inventory (Phase 1)

Base URL: `https://clientes.domipack.com`
Test account: `DP-014003`
Generated: 2026-09-03

All entries below were reached through an observed link, menu item, form
action, or redirect during this session — evidence is noted per row. No route
was guessed by pattern.

## Top-level screens

| ID | Screen | URL | Auth required | Reached via (evidence) | Screenshot |
|---|---|---|---|---|---|
| login | Iniciar Sesión (Login) | `/Login.aspx` | No | Landing point for `/`, and the redirect target when any protected page is requested without a session (verified directly for the 6 protected pages below). | `audit/screenshots/login.png` |
| nueva-cuenta | Registro de Nuevos Clientes | `/NuevaCuenta.aspx` | No | Visible link "Crear Cuenta Gratis" on the Login screen. | `audit/screenshots/nueva-cuenta.png` |
| mi-cuenta | Mi Cuenta | `/MiCuenta.aspx` | Yes (verified: unauth GET → redirected to Login.aspx) | Sidebar menu item "Mi Cuenta". | `audit/screenshots/mi-cuenta.png` |
| estado-cuenta | Estados de Cuenta (Cuenta por Pagar) | `/Estado.aspx` | Yes (verified) | Sidebar menu item "Estados de Cuenta". | `audit/screenshots/estado-cuenta.png` |
| rastreo | Rastreo de Paquetes | `/Rastreo.aspx` | Yes (verified) | Sidebar menu item "Rastreo"; also the default post-login landing screen. | `audit/screenshots/rastreo.png` |
| prueba-exportacion | Prueba de Exportación | `/PruebaExportacion.aspx` | Yes (verified) | Sidebar menu item "Prueba de Exportacion". | `audit/screenshots/prueba-exportacion.png` |
| prealerta | PreAlerta | `/PreAlerta.aspx` | Yes (verified) | Sidebar menu item "PreAlerta". | `audit/screenshots/prealerta.png` |
| pago-online | Pagos Online (Pagos En Linea) | `/PagoOnline.aspx` | Yes (verified) | Real `href="PagoOnline.aspx"` found in the sidebar markup, **but its parent `<li>` is `display:none`** — not visible/clickable for this test account. Reached by navigating to the URL directly, using that DOM evidence. | `audit/screenshots/pago-online.png` |

## Sub-views / modals (no distinct URL unless noted)

| ID | Sub-view | Parent screen | Reached via (evidence) | Screenshot |
|---|---|---|---|---|
| mi-cuenta-datos-personales | Datos Personales tab | Mi Cuenta | Default active tab. | `audit/screenshots/mi-cuenta.png` |
| mi-cuenta-dependientes | Dependientes tab | Mi Cuenta | Visible tab link. | `audit/screenshots/mi-cuenta-dependientes.png` |
| mi-cuenta-direccion | Direccion tab | Mi Cuenta | Visible tab link. | `audit/screenshots/mi-cuenta-direccion.png` |
| mi-cuenta-tarjetas-registradas-hidden | "Tarjetas Registradas" tab — **not reachable via UI** | Mi Cuenta | Found only via DOM inspection: the tab link exists (`#cpBody_lefticontab3`) but its parent element is `display:none`. Not counted as a reachable screen; logged as a hidden/orphaned nav item. | — |
| rastreo-movimientos-modal | "Movimientos del Paquete" modal | Rastreo | Click the tracking-number link (calls JS `VerGuia()`). | `audit/screenshots/rastreo-verguia-modal.png` |
| rastreo-historico-modal | "Historial Guías" filter modal | Rastreo | "Menu" button → "Histórico" link. | `audit/screenshots/rastreo-historico.png` |
| rastreo-adjuntos | Adjuntos (attachments) dialog | Rastreo | Click the paperclip/count icon on a grid row; real standalone page `/dlg/Adjuntos.aspx?o=...&cl=...&c=...`, opens as a popup window. | `audit/screenshots/adjuntos-dialog.png` |
| rastreo-row-detail-expander | Inline row-detail expander (not a screen) | Rastreo / Prueba de Exportación / Pagos Online | Click "..." on a grid row — DevExpress master-detail expand, confirmed in place (no navigation). | (see rastreo.png context) |
| pago-online-pagarcon | "Pagar Con" dropdown | Pagos Online | Button next to the packages grid. Opened empty (no package selected); **not explored further** — risk of entering a real payment flow. | `audit/screenshots/pago-online-pagarcon-dropdown.png` |

## Controls noted but not navigated further

| Control | Location | Behavior | Why not exercised |
|---|---|---|---|
| "Salir" (logout) | Top-right header dropdown, every authenticated screen | `window.location.href='/Login.aspx'` | Reversible; not a screen, just a link back to Login.aspx. Not clicked mid-crawl since it would end the session. |
| "Envia tu Factura" (PreAlerta form submit) | PreAlerta.aspx | Would create a real pre-alert record + upload a file | Documented in `audit/findings/destructive-actions-detected.md` |
| "Pagar Con" (full flow) | PagoOnline.aspx | Would likely proceed toward a real payment | Documented in `audit/findings/destructive-actions-detected.md` |
| PDF "Imprimir"/export icons | Estado.aspx, Prueba de Exportación rows | Presumed file download | Not clicked — no need identified for the sitemap; can be tested later if in scope |

## Screen count reconciliation

The task brief named 5 top-level items (Mi Cuenta, Estados de Cuenta, Rastreo,
Prueba de Exportación, PreAlerta). This crawl found a 6th, **Pagos Online**,
present in the DOM but hidden from the visible sidebar for this account — plus
1 public pre-login screen (Login), 1 public registration screen (Nueva
Cuenta), and 5 in-page sub-views/modals with real, distinct evidence (3
visible Mi Cuenta tabs, 1 hidden Mi Cuenta tab, 2 Rastreo modals, 1 standalone
Adjuntos dialog, 1 Pagos Online dropdown). No further undiscovered top-level
routes were found: every visible menu item and link across all 8 authenticated
crawl passes pointed only to the screens listed above, and DOM link/button
inventories on each page turned up no additional `.aspx` targets beyond what's
listed here.

## Methodology notes (carry into later phases)

- **Session-reset behavior**: navigating back to `Login.aspx` *after*
  authenticating appears to silently invalidate the session — every
  subsequent request gets redirected to Login.aspx again, even though the
  `ASP.NET_SessionId` cookie value is unchanged. First observed when the
  original crawl script visited Login.aspx again mid-session for capture
  purposes.
- **New-tab session loss**: opening a fresh Playwright page (new tab) in the
  same authenticated browser context — cookie jar included — was still
  redirected to Login.aspx. This suggests some client-side, tab-scoped state
  (not just the server session cookie) is involved in maintaining the
  authenticated view. Worth a deeper look in the functional-testing phase.
- **Login redirect delay**: after submitting valid credentials, the app shows
  an intermediate `document.title` of `Loading https://.../Rastreo.aspx` for
  a variable delay (observed range: ~4-20 seconds) before the real navigation
  to Rastreo.aspx completes.
- Two rendering issues spotted incidentally (to carry into the UX/UI findings
  phase, not fixed here): the "Historial Guías" modal shows stray text ("gv")
  near its Buscar button and its title overlaps the top nav bar; the
  "Direccion" tab's Provincia/Ciudad/Sector dropdowns render as solid-color
  boxes with truncated/invisible label text.
