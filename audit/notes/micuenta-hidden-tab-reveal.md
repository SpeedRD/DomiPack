# Mi Cuenta tabs ignore the URL hash and `$().tab()` is not available — reveal hidden Bootstrap tabs by clearing the `<li>` display and clicking

- Deep links `MiCuenta.aspx#cpBody_lefticontab2|4|3` always open Datos Personales; clicking a tab
  does not update `location.hash` or `history.length`, and F5 resets to the first tab (finding MC-17).
- `window.$` is jQuery 3.7.1 loaded from code.jquery.com, but Bootstrap's JS is bundled inside
  `./assets/scripts/main.js` with its own jQuery, so `$('#cpBody_ltab3').tab('show')` throws
  `tab is not a function`. The `data-toggle="tab"` delegation still works on click.
- Client-side reveal that involves no server request (verified: 0 document/xhr/fetch requests):
  ```js
  document.getElementById('cpBody_ltab3').closest('li').style.display = '';  // was "Display:none;"
  document.getElementById('cpBody_ltab3').click();
  ```
  This shows the fully rendered "Tarjetas Registradas" pane (grid `#cpBody_gvTarjetas`, button
  `#cpBody_Button4` "Agregar Tarjeta", DevExpress popup `#cpBody_ppDelCard`). Do not click the button.
