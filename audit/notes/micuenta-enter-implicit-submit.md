# Every authenticated page is one WebForms form whose first submit button is the hidden master-page `#SetCliente` — never press Enter in Mi Cuenta

`MiCuenta.aspx` (and the other authenticated screens) render a single `<form id="frmBody">` with no
`onsubmit`, no `DefaultButton`, and no validators (`window.Page_Validators` is undefined). The first
`input[type=submit]` in document order is
`<div style="display: none"><input name="ctl00$lsClienteID" type="text" id="lsClienteID"><input type="submit" name="ctl00$SetCliente" value="" id="SetCliente"></div>`
(master page, before the content placeholder), followed by the hidden `#cpBody_BVerificar` "Canjear
Cupon" and only then `#cpBody_Button1` "Guardar".

Per the HTML implicit-submission rules, Enter inside any text field activates that first submit
button even though it is hidden, so an Enter keystroke would post back to `SetCliente` — an
unknown handler — rather than to the visible save button. Consequences for the audit:
- Playwright `fill()` and `keyboard.insertText()` are safe; `keyboard.press('Enter')` is not.
- Logged as finding MC-07 (`impacto_a_confirmar: true`, not exercised).
- The same structure means "double submit" cases can only be evaluated statically here.
