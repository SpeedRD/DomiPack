# NuevaCuenta.aspx calls `WebService1.asmx` on blur of the ID field — gate those calls when probing

`#Identificacion` and `#iRNC` carry `onblur="GetDataCliente();"`, which POSTs
`WebService1.asmx/GetNombreCedula` **and** `GetNombreRNC` (both, for tipo Personal — the `Tipo`
variable stays "0") with `rncCedula=<typed value>&TokenID=<value of hidden #TokenID>`, then GETs
`WebService1.asmx/RuaVerify?TokenID=…&ID=…&Tipo=Cedula`. The success callbacks are the ONLY thing
that enables `#Password`, `#ltelefono`, `#lcelular`, `#Email`, `#tbFecha` (the client-side
`valida_cedula()` checksum function exists but is not bound to any event).

Consequences for scripting (see `nueva-cuenta-fields.ts`):
- Every `fill('#Identificacion', …)` followed by focusing another element fires the lookups. When
  typing special-character / SQL-ish probes, abort `**/WebService1.asmx*` with `context.route()` so the
  validation probe never reaches the external lookup service (18 aborted calls logged in
  `audit/logs/evidence/nueva-cuenta-asmx-calls.json`). Aborted calls trigger the page's own
  `alert("[object Object]")` (VerificarRua error handler) — auto-dismiss dialogs with `page.on('dialog')`.
- To test the fields that load disabled without a real lookup, replicate the callback:
  `['tbFecha','Email','tbContacto','ltelefono','lcelular','Password'].forEach(id => el.removeAttribute('disabled'))`.
- Only obviously bogus IDs (`abc`, `00000000000`) were sent to the real service; it answered `[]`
  and the page wrote the literal `[]` into `#Nombre` (finding NC-04).
- Sitemap addition (one confirming GET): `https://clientes.domipack.com/WebService1.asmx` → 200 service
  description listing 26 operations (see `audit/logs/evidence/sitemap-webservice1.json`). Not explored.
- `NuevaCuenta.aspx?medio=<code>` preselects `#cbMedioiD` (`?medio=04` → "04"); without the parameter
  the second load handler overwrites the first one's "04" with `null` → blank option.
