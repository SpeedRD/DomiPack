# Phase 4 — grupo `login` (Login + Nueva Cuenta)

Fecha: 2026-09-03. Worker: grupo `login`. Contextos: todos no autenticados salvo los 4 contextos
desechables de `login-loading.ts` (logins reales para BT-01/BT-04/BT-07/NV-08) y el contexto dedicado
de `login-nv10-last.ts` (NV-10, última acción). Registro caso×instancia en `login.jsonl` (132 líneas);
hallazgos en `audit/findings/partial/login.json` (35).

## Reglas cumplidas
- `#bSend` (Nueva Cuenta) solo se clicó cuando `form.checkValidity() === false`; además todos los POST a
  `NuevaCuenta.aspx` estaban abortados por `context.route` (backstop): **0 POST bloqueados = ninguno
  intentó salir**. Nunca se envió el formulario de registro.
- `Recuperar()` nunca se ejecutó: inspección estática del script (`login-inline-scripts.js`), logueado
  como `executed-static` (LG-17).
- Login: intentos con credenciales erróneas/vacías/basura en un contexto sin sesión; logins correctos solo
  en contextos desechables; ningún contexto autenticado visitó `Login.aspx` salvo NV-10 (último).
- Sondeos TF-05/TF-07/SL-07: solo validación. El 500 con caracteres especiales (LG-05) se documenta de
  forma neutra, sin profundizar. Las llamadas al web service de cédula con caracteres especiales se
  abortaron; solo se enviaron valores bogus (`abc`, `00000000000`).

## Resumen por pantalla (por caso; un caso cuenta como fail si alguna instancia falló)

| Pantalla | Aplicables (§13) | Ejecutados | Pass | Fail | Executed-static | Omitidos |
|---|---|---|---|---|---|---|
| Login | 37 | 33 | 8 | 22 | 3 | 4 |
| Nueva Cuenta | 53 | 50 | 5 | 31 | 14 | 3 |

Registros caso×instancia: Login 55 (18 pass / 25 fail / 7 static / 4 omitted + 1 corrección);
Nueva Cuenta 77 (12 pass / 42 fail / 19 static / 3 omitted + 1 corrección).

### Omitidos (con motivo)
- Login TF-08 `#lUser`: no es campo nombre/cédula/RNC (código de cuenta DP-xxxxxx).
- Login TF-11: sin textarea. Login TF-12: sin campos deshabilitados al cargar.
- Login CC-04: la pantalla no renderiza footer (`footerPresent=false`); el footer compartido es del grupo shared chrome.
- Nueva Cuenta TF-11: sin textarea. EM-07 y PH-03: instancias exclusivas de Mi Cuenta (grupo micuenta).

### Correcciones registradas
- BT-11/AX-04 (ambas pantallas): la primera lectura de estilos de foco se hizo inmediatamente tras Tab
  (en mitad de la transición de Bootstrap; ver `notes/focus-styles-read-mid-transition.md`). Se re-midió
  con `login-focus-check.ts` (600 ms de espera): inputs/selects/botón sí tienen indicador; sin
  indicador quedan la casilla y los dos enlaces secundarios de Login y las dos casillas de Nueva Cuenta.
  LG-10 rebajado a menor; NC-13 mantiene mayor por el orden de tabulación. Filas `CORRECTION` en el jsonl.
- DR-08: primera ejecución inválida por un error de interpolación en el script (valor literal `${v}`);
  fila eliminada y caso re-ejecutado con `nueva-cuenta-dob.ts`.

## Hallazgos (35)
Login (LG): 01 labels placeholder-only (mayor) · 02 sin reveal/autocomplete (menor) · 03 contraseña vacía/espacios → envío silencioso (mayor) · 04 icono info en 'Error!' (menor) · 05 HTTP 500 con caracteres especiales en usuario/contraseña (mayor) · 06 Remember me sin name, sin efecto (menor) · 07 Entrar es `<a href=#>`, Espacio no activa (menor) · 08 login correcto ~18 s sin feedback (mayor) · 09 logo → index.html 404 (menor) · 10 foco no visible en casilla/enlaces (menor) · 11 axe: lang, contraste botón 4.14, landmarks (menor) · 12 copy mixto ES/EN, título 'Web Trans' (menor) · 13 dlg/Adjuntos.aspx sin sesión → 500 (mayor) · 14 logo oculto a 375px, targets pequeños, .accountbg desborda (menor) · 16 visitar Login.aspx mata la sesión (mayor) · 17 Recuperar sin flujo/confirmación [static, a confirmar] (menor) · 18 jQuery 1.7.1 por http bloqueado / load nunca dispara (menor).
Nueva Cuenta (NC): 01 14 controles sin label (mayor) · 02 casillas Domicilio/Rua sin etiqueta ni explicación (menor) · 03 requeridos inconsistentes; Password/Celular required+disabled [a confirmar servidor] (mayor) · 04 lookup de cédula: '[]' en Nombre, alert [object Object], sin feedback (mayor) · 05 placeholder promete lista ';' que type=email rechaza (mayor) · 06 confirmación de correo sin comparar [a confirmar] (menor) · 07 teléfonos sin validación/type=tel (menor) · 08 password sin política/confirmación (menor) · 09 fecha nacimiento sin min/max (menor) · 10 selects sin required, 'Seleccionar' enviable (menor) · 11 change() deja Fecha oculta / etiqueta Pasaporte (menor) · 12 selects largos y copy de Referido con nombres propios/erratas (menor) · 13 tabindex positivos rompen el orden, casillas sin foco (mayor) · 14 Confirmar() con API SweetAlert v1 sobre SweetAlert2: OK/Esc no llaman a Guardar() [static, a confirmar] (mayor) · 15 alt 'Girl in a jacket', tildes, placeholder tbFecha (menor) · 16 casillas 13px, placeholder truncado (menor) · 17 axe: contraste 2.51 en etiquetas grises, image-alt, lang (menor) · 18 banner externo i.postimg.cc deformado 319×1135 (mayor).

## Sitemap additions (evidencia; una sola GET de confirmación cada una)
- `/index.html` — href del logo de Login → **404** (`LG-09-logo-link.json`).
- `/WebService1.asmx` — llamado por el JS de Nueva Cuenta (`GetNombreCedula`, `GetNombreRNC`, `RuaVerify`); la
  página de descripción responde 200 y lista 26 operaciones (`sitemap-webservice1.json`). No explorado.
- `NuevaCuenta.aspx?medio=<código>` — parámetro que preselecciona `#cbMedioiD` (`nueva-cuenta-medio-param.json`).
- Sub-formularios ocultos en NuevaCuenta.aspx: `#bsendConfi` (segundo submit), `#codigoPromo`, `#TokenID`
  (valor fijo en el HTML usado como token del web service — se anota de forma neutra, no se investigó),
  `#cbPais`/`#cbProvincias` (postback, Provincias vacío).

## Ruido no promovido (notable non-findings)
- Login `TF-04`: 5.000 y 100.000 caracteres en usuario → 200 con el mensaje normal (sin maxlength, sin crash).
- Login `TF-06`/`PW-03`: unicode y contraseña de 10.000 caracteres → mensaje normal.
- Login `TF-05` `<script>` y `TF-07` `{{7*7}}`/`${x}` → tratados como texto (solo la comilla/especiales dan 500 → LG-05).
- Login `BT-01`: doble clic → 1 POST (pass); `BT-04`: navegar a NuevaCuenta.aspx durante la carga no rompe la sesión (pass).
- Login `NV-05`: 6 rutas protegidas → 302 `/Login.aspx` con cuerpo mínimo (128 B, sin fuga); solo Adjuntos falla (LG-13).
- Login `PW-02`: mensaje idéntico para usuario inexistente y contraseña errónea (sin enumeración): correcto.
- Overflow horizontal de `.accountbg` a 768/1440: sin barra de scroll por `overflow-x:hidden` en html; se incluye en LG-14 como detalle, no como hallazgo propio.
- Consola Nueva Cuenta: `SweetAlert2: Unknown parameter "buttons"/"dangerMode"` (parte de NC-14); avisos "The specified value … does not conform to the required format" al fijar fechas por DOM (artefacto del script).
- `lSucursal.addEventListener('select', logSelection)` y `#log` inexistente: código muerto sin efecto (mencionado en NC-12).
- Cabecera `Confirmar()`/`Guardar()` duplicada en Login.aspx sin uso.
- Los logs de consola/red de `p4-login-fields` y `p4-nueva-cuenta-fields` no se escribieron (los scripts
  abortaron por timeouts antes de `s.close()` — `networkidle` y `fill` de fecha inválida); los datos de esos
  casos están en los `ATTEMPT` del stdout (`scratchpad/login-fields.out`) y en los JSON de evidencia.

## Lecciones (notas)
- `notes/login-load-event-never-fires.md` — Login.aspx nunca dispara `load`; usar `domcontentloaded`.
- `notes/nueva-cuenta-webservice-lookup.md` — blur en Cédula dispara WebService1.asmx; cómo gatearlo y simular la habilitación.
- `notes/login-post-302-latency.md` — el login correcto es un POST de ~17 s → 302; implicaciones para BT-01/BT-04.
- Reutilizadas: `tsx-evaluate-name-shim.md` (aquí resuelto con scripts string), `focus-styles-read-mid-transition.md`,
  `static-form-validation-without-submit.md` (mismo patrón route-abort + checkValidity).
- Playwright: `page.fill()` en `type=date` rechaza fechas imposibles (`2026-02-30`) con "Malformed value" — fijar por DOM;
  `uncheck()` de `#checkbox-signup` falla porque el `<label for>` intercepta el clic — clicar el label.

## Scripts
`audit/scripts/phase4/`: `login-static.ts`, `login-fields.ts`, `login-nav-axe.ts`, `login-responsive.ts`,
`login-loading.ts`, `login-overflow-probe.ts`, `login-focus-check.ts`, `login-finding-shots.ts`,
`login-nv10-last.ts`, `nueva-cuenta-fields.ts`, `nueva-cuenta-selects.ts`, `nueva-cuenta-dob.ts`,
`nueva-cuenta-responsive-axe.ts`, `nueva-cuenta-footer-probe.ts`.
