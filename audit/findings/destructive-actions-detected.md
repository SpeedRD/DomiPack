# Destructive / irreversible actions detected (not executed)

Controls found during Phase 1 discovery that could create real data or initiate a
real financial transaction. These were identified but deliberately NOT clicked
through to completion, per the audit's golden rule.

## 1. PreAlerta.aspx — "Envia tu Factura" form submission

- **Screen:** PreAlerta.aspx (menu item "PreAlerta")
- **Control:** Form "AGREGAR PRE-ALERTA" (fields: Tracking, Codigo Cliente,
  Valor Declarado, Transportista, Suplidor, Contenido, Subir Factura) with
  submit button "Envia tu Factura".
- **What it appears to do:** Creates a real pre-alert record tied to the test
  account (DP-014003) and uploads a file as an invoice attachment. The grid on
  the right ("No data to display") lists existing pre-alerts, implying a
  submission would create a new, real, persisted row.
- **Why not executed:** Submitting would create real data in the client's
  account with no confirmed safe way to delete it afterward without risking
  side effects (e.g., notifications to staff, downstream processing).
- **Evidence:** screenshot `audit/screenshots/prealerta.png`.

## 2. PagoOnline.aspx — "Pagar Con" payment flow

- **Screen:** PagoOnline.aspx ("Pagos En Linea"). Note: this screen's sidebar
  link is present in the DOM but its parent `<li>` is `display:none` — it is
  not visible/clickable in the UI for this test account. Reached only by
  navigating directly to the URL (evidence: real `href="PagoOnline.aspx"`
  found in the rendered sidebar markup).
- **Control:** Button "Pagar Con" (dropdown) next to a grid of "Paquetes
  Disponibles" (available packages to pay for).
- **What it appears to do:** Initiates a payment flow for one or more
  packages. Clicking it with no package selected opened an empty dropdown
  panel (no options rendered) — full behavior with a package selected was not
  tested.
- **Why not executed:** Any further interaction risks entering a real payment
  /checkout flow (potentially reaching a real payment gateway), which is
  explicitly prohibited by the golden rule.
- **Evidence:** screenshot `audit/screenshots/pago-online.png` and
  `audit/screenshots/pago-online-pagarcon-dropdown.png`.

## Note on logout control

The "Salir" button (top-right header dropdown and top-right chevron menu) does
`window.location.href='/Login.aspx'`. This is reversible (re-login) and not a
destructive action against data, so it is not tracked here — just noted for
completeness in the sitemap.
