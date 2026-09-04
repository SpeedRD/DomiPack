# Resumen ejecutivo — Auditoría del portal de clientes Domipack

Cuenta de prueba `DP-014003`, `https://clientes.domipack.com`. Base completa
de datos en `audit/findings/findings.json` (105 hallazgos) y
`audit/patterns/patterns.json` (41 patrones); cobertura numérica en
`audit/reports/cobertura.md`.

## Conclusión

El portal funciona para las operaciones básicas — rastrear un paquete, ver el
estado de cuenta, editar datos personales — pero no tiene una capa de
producto: **no existe un sistema de diseño, ni un componente de formulario
reutilizable, ni una capa de validación en cliente, ni un sistema de mensajes
de la aplicación**. Cada pantalla resuelve por separado el mismo problema
(campo con etiqueta, modal, botón de guardar, estado de error) y lo resuelve
de forma distinta y, en la mayoría de los casos, de forma incompleta. Esa
ausencia de convenciones compartidas es la causa raíz detrás de 24 de los 41
patrones detectados y explica por qué un defecto casi nunca aparece una sola
vez: **10 hallazgos comparten la falta de `<label for>`, 9 comparten
controles solo-icono sin nombre accesible, 13 comparten contenido en inglés
en una app en español**.

Dos hallazgos son críticos por severidad (`RA-03`, `RA-09`): ambos son
errores de servidor sin manejar (HTTP 500 crudo de ASP.NET, o un grid que
queda vacío tras cualquier callback) alcanzables con interacción normal, no
con casos límite. Se listan primero en la tabla porque, aunque son solo 2 de
105, están vinculados a 4 de los patrones más transversales del informe
(`PAT-13`, `PAT-14`, `PAT-15`, `PAT-20`) — el mismo problema de fondo
("no hay una capa de validación/errores del lado del cliente ni del
servidor") se repite en al menos otros 19 hallazgos mayores/menores.

Para el rediseño, esto significa que **la prioridad no es corregir 105
hallazgos uno por uno**, sino construir un puñado de piezas compartidas
(componente de campo, componente de modal, sistema de mensajería, tokens de
color con contraste AA, plantilla única) que resuelven de una sola vez la
mayoría de los hallazgos de accesibilidad, copy y UX — ver la sección
"Patrones prioritarios" más abajo.

## Hallazgos por categoría (taxonomía fija)

| Categoría | Hallazgos | % del total |
|---|---:|---:|
| Accesibilidad | 27 | 25.7% |
| UX/UI | 20 | 19.0% |
| Validación | 15 | 14.3% |
| Copy/contenido | 14 | 13.3% |
| Robustez | 11 | 10.5% |
| Funcional | 8 | 7.6% |
| Responsive | 6 | 5.7% |
| Servidor | 4 | 3.8% |
| **Total** | **105** | **100%** |

(Un hallazgo puede llevar más de una etiqueta de categoría en `findings.json`;
esta tabla usa la categoría principal registrada por hallazgo, igual que el
recuento de `execution-log.md`.)

## Tabla de hallazgos (por severidad, luego por alcance sistémico)

Orden: severidad (crítico → mayor → menor) y, dentro de cada severidad, por
cuánto de un problema sistémico es el hallazgo — cuantos patrones enlaza, o
si alguno de sus patrones agrupa muchos otros hallazgos (columna "Patrones").
Un hallazgo con 5 patrones o vinculado a un patrón de 13 hallazgos no es un
defecto aislado: es la misma causa raíz vista desde otro ángulo, y así se
prioriza. Los 21 hallazgos `impacto_a_confirmar` aparecen en su lugar normal,
con la nota *(confirmación pendiente: …)* junto a su descripción.

| ID | Severidad | Pantalla | Categoría | Descripción | Patrones |
|---|---|---|---|---|---|
| RA-03 | Crítico | Rastreo > Historial Guías (modal) | servidor | Pulsar "Buscar" con las fechas vacías (ambas o una sola) o con una fecha imposible produce un error no controlado en el servidor: HTTP 500 con la página cruda de ASP.NET "Server Error in '/' Applic... | PAT-13, PAT-15, PAT-20 |
| RA-09 | Crítico | Rastreo (grid #cpBody_gvDatos) | funcional | Cualquier callback del grid (clic en una cabecera para ordenar, o plegar el grupo de estado) devuelve un grid vacío: desaparecen la fila de grupo y los paquetes y se muestra "No data to display". U... | PAT-14 |
| EC-07 | Mayor | Estado de Cuenta / Prueba de Exportación / PreAlerta / PagoOnline | accesibilidad | axe-core reporta en las 4 pantallas: zoom deshabilitado (meta viewport user-scalable=no, maximum-scale=1), contraste insuficiente (enlaces del menú #ea3537 sobre blanco 4.14:1, subtítulos #909499 2... | PAT-01, PAT-02, PAT-06, PAT-07, PAT-08, PAT-31 |
| MC-19 | Mayor | Mi Cuenta (las tres pestañas) | accesibilidad | axe-core reporta 7–9 reglas incumplidas por pestaña: button-name (hamburguesa sin nombre, critical), select-name (critical, 1–4 nodos), aria-allowed-attr (aria-expanded en un <a> sin rol, critical)... | PAT-01, PAT-02, PAT-04, PAT-06, PAT-07, PAT-08, PAT-31 |
| NC-03 | Mayor | Nueva Cuenta | validacion | La validación obligatoria en cliente es inconsistente: 'Cedula: *' (#Identificacion) no tiene required ni formato, 'Password:' no lleva asterisco pero es required, #Nombre acepta solo espacios y nú... *(confirmación pendiente: "Crear Cuenta" es STATIC-ONLY, no se creó una cuenta real para ver la validación de servidor)* | PAT-15, PAT-17, PAT-25, PAT-31, PAT-40 |
| PA-03 | Mayor | PreAlerta | robustez | El envío de la pre-alerta (acción que crea un registro real y sube un archivo) no tiene confirmación, ni protección contra doble envío, ni feedback de progreso: #cpBody_bSend es un submit sin oncli... | PAT-15, PAT-19, PAT-22, PAT-28, PAT-31 |
| MC-13 | Mayor | Mi Cuenta > Direccion | ux-ui | Los cuatro selects se renderizan como cajas rojas sólidas (fondo rgb(234,53,55), texto blanco). Ciudad y Sector están habilitados pero vacíos (0 opciones) y sin placeholder: son bloques rojos sin t... | PAT-08, PAT-25, PAT-26, PAT-36 |
| MC-16 | Mayor | Mi Cuenta (y chrome compartido) | accesibilidad | Contraste de texto por debajo de WCAG AA en numerosos elementos: pestañas inactivas 2.82:1 (rosa #f76a94 sobre blanco), footer 2.72:1, subtítulo 'Actualiza tu Datos.' 2.98:1, email en cabecera 2.36... | PAT-08, PAT-36 |
| PO-04 | Mayor | PagoOnline | ux-ui | A 1440 px las cabeceras del grid ('Guia', 'Fecha', 'Peso', 'FOB', 'Descripcion', 'Envianombre', 'Total A Pagar (DOP)') se pintan como cajas rojas con el texto en un tono casi idéntico: son práctica... | PAT-08, PAT-36 |
| LG-01 | Mayor | Login | accesibilidad | Los dos campos del formulario de acceso dependen únicamente del placeholder como etiqueta: no existe <label for>, aria-label ni aria-labelledby. Al escribir, el placeholder desaparece y el campo qu... | PAT-01 |
| MC-01 | Mayor | Mi Cuenta > Datos Personales / Dependientes / Direccion | accesibilidad | Todos los campos tienen una etiqueta visible pero ninguna está asociada programáticamente (sin for/id, sin aria-label, sin envolver el control). Los cinco selects no tienen nombre accesible (axe se... | PAT-01 |
| NC-01 | Mayor | Nueva Cuenta | accesibilidad | Ninguno de los 14 controles del formulario tiene etiqueta asociada programáticamente: las etiquetas visibles ('Tipo: *', 'Cedula: *', 'Nombre Completo: *'…) no usan for/id ni existe aria-label. axe... | PAT-01 |
| PA-01 | Mayor | PreAlerta | accesibilidad | Ningún campo del formulario tiene <label for> ni aria-label (0 <label> en el DOM): los textos 'Tracking: *', 'Valor Declarado(USD) *' etc. son texto suelto y el placeholder desaparece al escribir. ... | PAT-01, PAT-40 |
| EC-04 | Mayor | Estado de Cuenta | accesibilidad | El icono PDF de cada factura no tiene nombre accesible ni foco visible: es un <div> sin role/aria-label/title, con <img alt=""> y un <input type=submit value="submit"> oculto de 0×0 px que es el ún... | PAT-02, PAT-03, PAT-04, PAT-21 |
| MC-03 | Mayor | Mi Cuenta > Datos Personales / Dependientes | validacion | Los campos de correo y teléfono son <input type="text"> sin pattern, inputmode ni autocomplete: no hay semántica nativa (teclado móvil, validación inline) y cualquier formato inválido se acepta en ... *(confirmación pendiente: "Guardar" de Mi Cuenta es STATIC-ONLY, no se persistió un cambio real)* | PAT-16 |
| NC-05 | Mayor | Nueva Cuenta | validacion | El placeholder de ambos campos dice 'Para agregar otro correo electrónico debe separarlo con ;', pero son input type=email sin atributo multiple: cualquier valor con ';' es rechazado por el navegad... | PAT-16 |
| PA-06 | Mayor | PreAlerta | validacion | El valor declarado (base para impuestos/aduana) acepta en cliente valores negativos (-100), cero, 20 dígitos (99999999999999999999), 6 decimales (12.345678) y notación científica (1e5): no hay min,... | PAT-16, PAT-33 |
| RA-05 | Mayor | Rastreo (grid #cpBody_gvDatos) | accesibilidad | El control para plegar/desplegar el grupo de estado es una <img> con onclick, sin tabindex ni rol: no se alcanza con Tab ni se activa con teclado. El recorrido con Tab de toda la página pasa por si... | PAT-02, PAT-21 |
| SH-02 | Mayor | Chrome compartido (header, menú de usuario) | accesibilidad | El disparador del menú de usuario es un <a> sin href: no es enfocable con teclado (Tab salta de la hamburguesa al sidebar; el.focus() no lo enfoca), no tiene nombre accesible (texto vacío, img alt=... | PAT-02, PAT-21, PAT-29, PAT-35 |
| LG-03 | Mayor | Login | validacion | La contraseña no es obligatoria en cliente (#lPass sin required): con usuario válido y contraseña vacía o compuesta solo por espacios se envía el POST y la página se recarga sin ningún mensaje (sil... | PAT-15, PAT-17, PAT-20 |
| MC-06 | Mayor | Mi Cuenta > Datos Personales / Dependientes / Direccion | validacion | No existe ninguna validación en el cliente: ningún campo tiene required, maxlength ni pattern; window.Page_Validators no existe (sin validadores ASP.NET) y no hay JS de validación. Vacío, solo espa... *(confirmación pendiente: "Guardar" es STATIC-ONLY; se recomienda repetir con una cuenta de pruebas desechable)* | PAT-15, PAT-17 |
| NC-04 | Mayor | Nueva Cuenta | funcional | Al salir del campo Cédula se consulta un web service para autocompletar el nombre y habilitar Contraseña, Teléfono, Celular, Correo y Fecha. Con una cédula inválida ('abc' o '00000000000') el servi... | PAT-20, PAT-25, PAT-28 |
| NC-14 | Mayor | Nueva Cuenta | robustez | Inspección estática y prueba en cliente con Guardar() sustituido por un stub (sin envío): el botón 'Crear Cuenta' no tiene protección contra doble envío ni paso de confirmación previo. Existe un se... *(confirmación pendiente: "Crear Cuenta" es STATIC-ONLY; el paso de confirmación posterior no se ejecutó)* | PAT-19, PAT-20, PAT-22, PAT-28 |
| MC-04 | Mayor | Mi Cuenta > Datos Personales | ux-ui | El cambio de contraseña es un único campo password sin política visible (sin longitud mínima, sin medidor), sin confirmación, sin botón mostrar/ocultar, sin autocomplete="new-password" y sin texto ... *(confirmación pendiente: "Guardar" de Mi Cuenta es STATIC-ONLY, no se persistió un cambio real)* | PAT-17, PAT-18 |
| MC-14 | Mayor | Mi Cuenta > Direccion | funcional | Con esta cuenta el formulario de direcciones no se puede completar: País y Provincia cargan deshabilitados, por lo que Ciudad y Sector nunca se rellenan (dependen de un postback del padre) y no hay... *(confirmación pendiente: cascada País→Provincia→Ciudad bloqueada (campos disabled) en la cuenta de prueba)* | PAT-23, PAT-25, PAT-26 |
| PO-03 | Mayor | PagoOnline | funcional | El botón 'Pagar Con' está habilitado pero su menú desplegable contiene una <ul id=cpBody_ulFormaPagos> vacía (0 formas de pago renderizadas), lo que explica el 'dropdown vacío' visto en Fase 1; el ... *(confirmación pendiente: "Pagar Con" no pudo probarse con un paquete seleccionado (cuenta sin paquetes pagables))* | PAT-25, PAT-27, PAT-41 |
| RA-13 | Mayor | Rastreo > Historial Guías (modal) y Movimientos del Paquete (popup) | accesibilidad | Gestión del foco deficiente en ambos diálogos. Historial: al abrirse el foco permanece en el enlace "Histórico" (fuera del modal), Tab recorre primero los controles del grid de fondo antes de entra... | PAT-05, PAT-21 |
| EC-03 | Mayor | Estado de Cuenta | responsive | En móvil y tablet el grid de facturas no se adapta ni obtiene un contenedor con scroll propio: el documento entero desborda horizontalmente (scrollWidth 931 px en un viewport de 375 px; 946 px en 7... | PAT-10, PAT-36 |
| LG-08 | Mayor | Login | ux-ui | Con credenciales correctas el POST a Login.aspx tarda ~17–18 s en responder (302 a /Rastreo.aspx) y durante todo ese tiempo no hay ningún feedback: el botón sigue activo, sin spinner, sin bloqueo d... | PAT-19, PAT-23 |
| NC-18 | Mayor | Nueva Cuenta | ux-ui | Al pie del formulario se renderiza una imagen alojada en un servicio externo de terceros (i.postimg.cc), de 1024×500 px naturales, mostrada a 319×1135 px: aparece deformada verticalmente (logo Domi... | PAT-29, PAT-34 |
| LG-05 | Mayor | Login | servidor | Introducir caracteres especiales en el usuario o en la contraseña (el conjunto `< > " ' & % \ / ; { } \| # =` o la cadena `' OR 1=1 --`) provoca un HTTP 500 con la página genérica de ASP.NET 'Server... | PAT-13 |
| LG-13 | Mayor | Login (acceso sin sesión a rutas protegidas) | servidor | Sin sesión, todas las pantallas protegidas (MiCuenta, Estado, Rastreo, PruebaExportacion, PreAlerta, PagoOnline) responden 302 a /Login.aspx con un cuerpo mínimo ('Object moved', 128 bytes, sin fug... | PAT-13, PAT-35 |
| MC-08 | Mayor | Mi Cuenta (chrome compartido) | accesibilidad | Al navegar con teclado no hay indicador de foco visible en los enlaces del sidebar, la hamburguesa ni los enlaces del footer (outline:none, sin box-shadow ni cambio de color). El botón Guardar tien... | PAT-03 |
| MC-18 | Mayor | Mi Cuenta > Datos Personales / Dependientes / Direccion | responsive | A 375 px la página tiene desplazamiento horizontal en las tres pestañas (scrollWidth 398 / 609 / 534 px frente a 375): el select Sucursal sobresale del contenedor y los grids DevExpress (539 px y 4... | PAT-10, PAT-11 |
| NC-13 | Mayor | Nueva Cuenta | accesibilidad | Los tabindex positivos (1,2,3,3,4,5,6,6,7,8,8,8,10) rompen el orden de tabulación: Sexo, Domicilio y Rua Registrado (sin tabindex) reciben el foco después del botón 'Crear Cuenta'; Cédula (2) e iRN... | PAT-03, PAT-04 |
| PA-11 | Mayor | PreAlerta | accesibilidad | Los tabindex positivos rompen el orden de tabulación: Tracking(1) → Valor Declarado(2) → Suplidor(2) → Subir Factura(2) → Transportista(4) → Contenido(5) → Envia tu Factura(0), mientras el orden vi... | PAT-04 |
| PO-01 | Mayor | PagoOnline | servidor | PagoOnline.aspx responde HTTP 500 'Server Error in '/' Application – Runtime Error' (página amarilla ASP.NET) de forma determinista una vez que en la misma sesión se ha visitado Estado.aspx (o MiCu... *(confirmación pendiente: "Pagos Online" está oculto para esta cuenta; no hay cuenta habilitada para confirmar el flujo completo)* | PAT-13, PAT-14 |
| RA-15 | Mayor | Rastreo > Adjuntos (dlg/Adjuntos.aspx) | robustez | La página no valida sus parámetros: sin "c", sin "o", sin parámetros, o con caracteres especiales en "cl" devuelve HTTP 500 con la página cruda de ASP.NET "Runtime Error". Con "cl" ausente/vacío o ... *(confirmación pendiente: requiere probar el parámetro `cl` con datos de otra cuenta, fuera del alcance autorizado)* | PAT-13 |
| RA-18 | Mayor | Rastreo > Movimientos del Paquete (popup) | responsive | El popup de movimientos tiene tamaño fijo 1000×600 px. A 375 y 768 px desborda el viewport: se ve solo la columna Tracking, las columnas Estatus/Fecha y el botón × (x=961) quedan fuera de pantalla ... | PAT-05, PAT-10 |
| RA-12 | Mayor | Rastreo > Historial Guías (modal) | ux-ui | El modal se posiciona a ~28 px del borde superior y su cabecera (63 px) queda debajo de la barra superior fija de la app (60 px). A 1440/768 px el título se ve cortado y el centro del botón × está ... | PAT-05 |
| RA-20 | Mayor | Rastreo > Historial Guías (modal) / grid principal | ux-ui | Al pulsar Buscar, el modal se cierra (postback completo) y los resultados sustituyen al grid principal sin ninguna indicación del rango aplicado (las fechas solo se ven reabriendo el modal) y sin b... | PAT-14, PAT-24, PAT-37 |
| LG-16 | Mayor | Login | robustez | Con una sesión autenticada, visitar Login.aspx (por URL, por el logo/marcadores o por el enlace 'Salir') invalida la sesión: el formulario de acceso se muestra como si no hubiera sesión y cualquier... | PAT-35 |
| LG-11 | Menor | Login | accesibilidad | axe-core (1440px) reporta 5 violaciones: html sin atributo lang (serious), contraste insuficiente del botón Entrar 4.14:1 (#fff sobre #ea3537, serious), sin landmark main, sin h1 y contenido fuera ... | PAT-06, PAT-08, PAT-31 |
| LG-12 | Menor | Login | copy-contenido | Copy mixto español/inglés: 'Remember me' y placeholder 'Password' junto a 'Iniciar sesión', 'Entrar', 'Crear Cuenta Gratis'; 'Recuperar mi Contraseña?' lleva signo de interrogación de cierre sin ap... | PAT-31, PAT-32, PAT-34 |
| MC-09 | Menor | Mi Cuenta > Datos Personales / Dependientes / Direccion | copy-contenido | Copy inconsistente y con errores: 'Personal Detalles' (calco del inglés), subtítulo 'Actualiza tu Datos.' (concordancia), tildes ausentes de forma sistemática (Codigo, Identificacion, Contrasena, D... | PAT-31, PAT-32 |
| MC-11 | Menor | Mi Cuenta > Dependientes / Direccion | copy-contenido | Los grids vacíos muestran el texto por defecto de DevExpress 'No data to display' en inglés, sin guía ('Aún no tienes dependientes. Agrega uno con el formulario.'). | PAT-12, PAT-31 |
| NC-15 | Menor | Nueva Cuenta | copy-contenido | Copy y textos alternativos descuidados: el logotipo lleva alt='Girl in a jacket' (texto de tutorial), 'Cedula' y 'Direccion' sin tilde, 'Password' en inglés, placeholder 'tbFecha', etiquetas con pu... | PAT-31, PAT-32, PAT-34 |
| NC-17 | Menor | Nueva Cuenta | accesibilidad | axe-core reporta 10 tipos de violación (idénticos en los tres anchos): contraste 2.51:1 en las etiquetas grises (#98a4b9 sobre blanco: Fecha Nacimiento, Oficina, Domicilio, Referido, Rua Registrado... | PAT-01, PAT-04, PAT-06, PAT-08, PAT-31 |
| PA-10 | Menor | PreAlerta (y grids del portal) | copy-contenido | El listado de pre-alertas vacío muestra el texto por defecto de DevExpress en inglés ('No data to display', y 'Loading…' durante callbacks) en un portal en español cuyo <html lang='en'>. No orienta... | PAT-12, PAT-31 |
| PA-12 | Menor | PreAlerta | copy-contenido | Copy con errores e inconsistencias: 'Proovedor' (cabecera del grid; debe ser 'Proveedor'), 'Codigo Cliente', 'Envia tu Factura' (sin tildes), placeholder 'contenido' en minúscula, 'Valor Declarado(... | PAT-31, PAT-32 |
| RA-11 | Menor | Rastreo (+ modales y Adjuntos) | copy-contenido | Copy inconsistente/incorrecto: subtítulo "Consulta el estatus de tu Paquetes." (concordancia: "tus paquetes"); "Historial Guias" y columna "Guia" sin tilde frente a "Histórico" con tilde; "Codigo" ... | PAT-12, PAT-31, PAT-32, PAT-33 |
| MC-02 | Menor | Mi Cuenta > Datos Personales / Direccion | ux-ui | Cuatro controles cargan bloqueados sin ninguna explicación (sin tooltip, title, texto de ayuda ni icono): Codigo es readonly con fondo gris, Sucursal y País/Provincia son selects disabled con opaci... | PAT-08, PAT-25 |
| RA-14 | Menor | Rastreo > Adjuntos (dlg/Adjuntos.aspx) | ux-ui | El enlace "0" de la columna AD abre en una pestaña nueva una página desnuda: sin título (<title> vacío), sin cabecera ni logotipo, sin botón de cerrar/volver, sin explicación de qué es ni de cómo a... | PAT-05, PAT-06, PAT-08, PAT-12 |
| RA-19 | Menor | Rastreo | accesibilidad | axe reporta en Rastreo.aspx (1440) 8 tipos de violación: color-contrast (serious, 23 nodos: subtítulo .page-title-subheading, enlaces del sidebar, #llocalidad…), image-alt (critical: imagen del cli... | PAT-02, PAT-06, PAT-07, PAT-08 |
| SH-03 | Menor | Chrome compartido (footer) | copy-contenido | El footer muestra '2022 - DOMIPACK, TODOS LOS DERECHOS RESERVADOS.' (año desactualizado, hoy 2026) y tres enlaces legales con href="": al pulsarlos se recarga la página actual (un usuario que esté ... | PAT-08, PAT-23, PAT-29, PAT-34 |
| EC-06 | Menor | Estado de Cuenta / Prueba de Exportación / PagoOnline | copy-contenido | Formatos y copy inconsistentes entre pantallas de un portal en español: Estado muestra fechas 'MM-DD-YYYY' ('08-31-2026'), Prueba/PagoOnline 'M/D/YYYY' ('8/17/2026') y el PDF de la factura 'DD/MM/Y... | PAT-32, PAT-33 |
| MC-15 | Menor | Mi Cuenta > Direccion | ux-ui | El checkbox lleva class="form-control" (estilo de input de texto), por lo que ocupa 300×38 px y se dibuja como una caja cuadrada grande; la etiqueta 'Principal:' no está asociada, así que solo se m... | PAT-01, PAT-36 |
| NC-02 | Menor | Nueva Cuenta | copy-contenido | Dos casillas sin etiqueta asociada ni texto explicativo. 'Domicilio' al marcarse solo muestra un campo de texto 'Direccion' (los selects cbPais/cbProvincias existen ocultos y Provincias no tiene op... | PAT-01, PAT-26, PAT-41 |
| NC-12 | Menor | Nueva Cuenta | copy-contenido | Dos selects nativos largos sin búsqueda ni agrupación. El de 'Referido' mezcla canales (REDES SOCIALES, PAGINA WEBS), empresas y nombres propios de personas (posibles referidores/empleados) expuest... | PAT-28, PAT-30, PAT-32 |
| PO-02 | Menor | PagoOnline | ux-ui | El único paquete (DP01-00306834, 'Total A Pagar (DOP)' 0.00) aparece ya seleccionado (clase dxgvSelectedRow) sin que el usuario lo elija, y el footer muestra 'DOP$: 0.000' con tres decimales y sin ... | PAT-09, PAT-32, PAT-33, PAT-39 |
| PO-05 | Menor | PagoOnline | copy-contenido | Copy con errores: 'Pagas tu Paquetes y evitas filas.' (concordancia: 'tus paquetes'), 'Pagos En Linea' (Línea), cabecera 'Envianombre' (nombre de campo interno), 'Descripcion', 'Guia'. | PAT-32 |
| RA-01 | Menor | Rastreo > Historial Guías (modal) | copy-contenido | El texto literal "gv" se renderiza como contenido visible entre el campo "Fecha Hasta" y el botón "Buscar" del modal Historial Guías. Es un nodo de texto huérfano en el markup (probablemente restos... | PAT-32 |
| RA-02 | Menor | Rastreo > Historial Guías (modal) | accesibilidad | Las etiquetas "Fecha Desde:" y "Fecha Hasta:" son elementos <label> sin atributo for y los inputs no tienen aria-label/aria-labelledby, por lo que los campos de fecha no tienen nombre accesible (la... | PAT-01 |
| LG-02 | Menor | Login | ux-ui | El campo de contraseña no ofrece control de mostrar/ocultar y ninguno de los dos campos declara autocomplete (username / current-password), lo que degrada la integración con gestores de contraseñas... | PAT-16, PAT-18 |
| MC-10 | Menor | Mi Cuenta > Dependientes | validacion | El placeholder promete un formato de máscara '+99-99-9999-9999' pero el campo no aplica máscara, pattern ni longitud: '8091234567', '123', '9'×60 o 'abc +++ ()' se aceptan. | PAT-16, PAT-33 |
| NC-07 | Menor | Nueva Cuenta | validacion | Teléfono y Celular son input type=text sin pattern, inputmode, minlength ni maxlength: 'abc', '+++', '()', '1' y 60 dígitos se aceptan como válidos en cliente; espacios y guiones se envían tal cual... | PAT-16 |
| NC-09 | Menor | Nueva Cuenta | validacion | La fecha de nacimiento no tiene min/max ni validación de plausibilidad: 2035-01-01 (futuro), la fecha de hoy y 1900-01-01 se aceptan como válidas. El campo, además, se rellena automáticamente desde... | PAT-16 |
| PA-07 | Menor | PreAlerta | validacion | El número de tracking no tiene validación de formato (acepta 'abc!!##', caracteres especiales, emoji) ni se relaciona con el transportista elegido; la app tampoco avisa de trackings ya pre-alertado... *(confirmación pendiente: "Envia tu Factura" es STATIC-ONLY, no se confirmó la validación de tracking en servidor)* | PAT-16 |
| PA-09 | Menor | PreAlerta | validacion | El input de archivo no restringe tipo (accept=null) ni tamaño, y no da feedback más allá del nombre nativo: en cliente se aceptan .txt, .pdf y un archivo 'fixture-fake.pdf.exe'. Es obligatorio (req... *(confirmación pendiente: "Envia tu Factura" es STATIC-ONLY, no se confirmó el manejo de archivos en servidor)* | PAT-16, PAT-40 |
| PE-03 | Menor | Prueba de Exportación | accesibilidad | El icono 'Imprimir' de cada fila expone como nombre accesible el alt de la imagen, que es 'Clone' (el ID interno del CustomButton), aunque el title visual dice 'Imprimir'. El expansor de detalle ex... | PAT-02, PAT-38 |
| RA-07 | Menor | Rastreo (grid #cpBody_gvDatos) | accesibilidad | Controles solo-icono del grid sin nombre accesible o con nombre engañoso: la imagen del clip (http://sys.translogic.com.do/img/Clip.png) no tiene alt; los toggles dxGridView_gvExpandedButton / gvHi... | PAT-02, PAT-29 |
| SH-01 | Menor | Chrome compartido (header) | accesibilidad | Los tres botones de icono funcionan (colapsan/abren el sidebar y el header móvil) pero no tienen nombre accesible ni estado: sin aria-label, aria-expanded ni aria-controls, texto vacío. axe button-... | PAT-02 |
| LG-04 | Menor | Login | copy-contenido | El mensaje de credenciales incorrectas se muestra con el icono 'i' (información) de SweetAlert2 y el título 'Error!', una combinación incoherente. El texto es útil ('recuerde colocar el guion') y e... | PAT-20 |
| MC-05 | Menor | Mi Cuenta > Datos Personales / Dependientes / Direccion | robustez | Los tres botones de guardado son <input type=submit> sin onclick, sin diálogo de confirmación, sin deshabilitado-al-enviar ni indicador de carga. La página incluye un helper Confirmar()/SweetAlert ... *(confirmación pendiente: "Guardar" de Mi Cuenta es STATIC-ONLY, no se persistió un cambio real)* | PAT-19, PAT-20, PAT-28 |
| NC-06 | Menor | Nueva Cuenta | validacion | El campo de confirmación de correo no se compara en cliente con el correo principal: con 'uno@example.com' y 'dos@example.com' el formulario es válido. Ningún script de la página referencia Email1.... *(confirmación pendiente: "Crear Cuenta" es STATIC-ONLY, no se confirmó el comportamiento de envío real)* | PAT-15 |
| NC-10 | Menor | Nueva Cuenta | validacion | Ningún select es required: 'Sexo' puede enviarse con el placeholder 'Seleccionar' (value 'S'), 'Referido' arranca en una opción vacía y 'Oficina' viene preseleccionada en 'OFICINA PRINCIPAL NACO' s... | PAT-28, PAT-39 |
| NC-11 | Menor | Nueva Cuenta | funcional | El cambio de tipo de cliente deja estados inconsistentes: Personal -> Empresa -> Extranjero oculta 'Fecha Nacimiento' para el extranjero (persona física) porque Extranjero no restaura la sección; y... | PAT-27, PAT-28 |
| PA-04 | Menor | PreAlerta | validacion | Los campos obligatorios aceptan sólo espacios en blanco ('   ' → checkValidity=true): el required nativo no hace trim y la app no valida en cliente. *(confirmación pendiente: "Envia tu Factura" es STATIC-ONLY (crearía una pre-alerta real))* | PAT-15, PAT-17 |
| PO-06 | Menor | PagoOnline / PreAlerta / Prueba de Exportación | robustez | Observaciones estáticas del código del checkout (no ejecutado): (a) el manejador de 'Domicilio' llama GetLocation()() — invoca el resultado (undefined) de GetLocation, lo que lanzaría un TypeError ... *(confirmación pendiente: sub-formulario de checkout oculto; no hay cuenta habilitada para completarlo)* | PAT-20, PAT-26, PAT-28, PAT-30 |
| RA-10 | Menor | Rastreo > Historial Guías (modal) | validacion | Un rango invertido (Desde 2026-06-01, Hasta 2026-01-01) se acepta sin aviso y el grid muestra "No data to display"; el mismo texto aparece para un rango futuro sin datos. No se distingue "no hay re... | PAT-12, PAT-15, PAT-20, PAT-37 |
| LG-07 | Menor | Login | accesibilidad | El botón principal es un enlace con href='#' y rol link, no un botón: se anuncia como enlace, la tecla Espacio no lo activa (solo Enter) y cada activación añade '#' a la URL. Enter dentro del campo... | PAT-21, PAT-22 |
| LG-17 | Menor | Login | ux-ui | Inspección estática: Recuperar() hace document.getElementById('bRecuperar').click(), es decir, envía el mismo formulario de login con el submit oculto #bRecuperar. No hay pantalla ni campo propio d... *(confirmación pendiente: "Recuperar mi Contraseña" es STATIC-ONLY (no se envió un correo real))* | PAT-18, PAT-21, PAT-22 |
| NC-08 | Menor | Nueva Cuenta | ux-ui | El campo de contraseña del registro no tiene política visible ni técnica: sin minlength/pattern, sin indicador de fortaleza, sin campo de confirmación, sin mostrar/ocultar y sin autocomplete='new-p... | PAT-17, PAT-18 |
| PA-02 | Menor | PreAlerta | ux-ui | El campo 'Codigo Cliente' se muestra deshabilitado con el código de la cuenta (DP-014003), marcado como obligatorio (*) y sin explicación (sin title/aria-describedby/texto de ayuda). Al ser disable... | PAT-25, PAT-40, PAT-41 |
| PA-05 | Menor | PreAlerta | robustez | Ningún campo de texto tiene maxlength: se aceptan 5.000 y 100.000 caracteres en cliente sin límite ni aviso (el layout no se rompe: el input hace scroll interno). El límite, si existe, sólo está en... *(confirmación pendiente: "Envia tu Factura" es STATIC-ONLY, no se confirmó el manejo de textos largos en servidor)* | PAT-17 |
| RA-04 | Menor | Rastreo > Historial Guías (modal) | robustez | El botón Buscar no se deshabilita ni muestra ningún estado de carga al pulsarlo; un doble clic dispara dos POST de Rastreo.aspx (el segundo cancela/duplica al primero). No hay feedback visual de qu... | PAT-19, PAT-21 |
| EC-05 | Menor | Estado de Cuenta | ux-ui | La descarga de la factura funciona (PDF válido, 1 página, Crystal Reports) pero el archivo se llama con un GUID (p. ej. 'a7f01673-fab6-4eb7-bd8e-0e5586214949.pdf') en lugar del número de factura, y... | PAT-19, PAT-23, PAT-38 |
| LG-09 | Menor | Login | funcional | El logotipo de la pantalla de acceso enlaza a index.html, que responde 404 ('404 - File or directory not found.'). | PAT-34 |
| LG-14 | Menor | Login | responsive | A 375px el logotipo desaparece por completo (a.logo pasa a display:none y la tarjeta queda con un hueco vacío arriba); los enlaces 'Recuperar mi Contraseña?' y 'Crear Cuenta Gratis' miden 17px de a... | PAT-10, PAT-11, PAT-34 |
| MC-07 | Menor | Mi Cuenta (y toda pantalla autenticada: formulario único frmBody de la master page) | robustez | Toda la página es un único <form> sin defaultbutton. El primer botón submit en orden de documento es #SetCliente (input oculto junto a #lsClienteID en la master page), por lo que pulsar Enter en cu... *(confirmación pendiente: "Guardar" es STATIC-ONLY, no se observó el postback real al pulsar Enter)* | PAT-22 |
| MC-17 | Menor | Mi Cuenta (pestañas) | funcional | Las pestañas no sincronizan con la URL: un enlace profundo a #cpBody_lefticontab2 o #cpBody_lefticontab4 abre siempre Datos Personales, y al recargar (F5) estando en Direccion se vuelve a Datos Per... | PAT-23, PAT-24 |
| NC-16 | Menor | Nueva Cuenta | responsive | Sin desbordamiento horizontal a 375/768/1440, pero las casillas 'Domicilio' y 'Rua Registrado' son de 13×13 px dentro de un contenedor .form-control de ancho completo (objetivo táctil pequeño y vis... | PAT-11, PAT-36 |
| SH-05 | Menor | Mi Cuenta > Tarjetas Registradas (oculta) / PagoOnline.aspx | robustez | Varias funciones se 'ocultan' solo con CSS pero siguen renderizadas y operativas en el DOM: la pestaña Tarjetas Registradas se revela quitando display:none al <li> y pulsándola (sin ninguna petició... *(confirmación pendiente: pestaña "Tarjetas Registradas" oculta (display:none), no accesible desde la UI con esta cuenta)* | PAT-22, PAT-27, PAT-30 |
| SH-06 | Menor | Chrome compartido (sidebar) | ux-ui | El colapso del sidebar (280 px → 80 px, se re-expande al pasar el ratón) no persiste: al navegar a otra pantalla el sidebar vuelve a abrirse. Toda navegación es una carga completa de página, así qu... | PAT-23, PAT-24 |
| LG-06 | Menor | Login | funcional | La casilla 'Remember me' (marcada por defecto) no tiene atributo name, por lo que nunca viaja en el POST: marcada o desmarcada, el formulario envía exactamente los mismos campos (__VIEWSTATE, __VIE... | PAT-18, PAT-41 |
| LG-10 | Menor | Login | accesibilidad | Tres controles no muestran ningún indicador de foco al navegar con teclado: la casilla 'Remember me' y los enlaces 'Recuperar mi Contraseña?' y 'Crear Cuenta Gratis' (outline none, sin box-shadow n... | PAT-03 |
| LG-18 | Menor | Login | robustez | La página carga jQuery 1.7.1 desde http:// (contenido mixto). El navegador bloquea el script en cada carga (error de consola 'Mixed Content … This request has been blocked'); la página sigue funcio... *(confirmación pendiente: solo se observa si un envío real llega a disparar la carga en cuestión)* | PAT-29 |
| PE-01 | Menor | Prueba de Exportación | responsive | A 375 px el grid (modo adaptativo activo) sobresale 3 px del card contenedor (borde derecho 363 px vs 360 px del card), cortando el borde del último header. No hay desbordamiento del documento. | PAT-10 |
| RA-08 | Menor | Rastreo | accesibilidad | Al recibir el foco por teclado, los enlaces del grid y el elemento activo del sidebar no muestran ningún cambio visual (outline: none, sin box-shadow ni cambio de fondo). Solo el botón "Menu" cambi... | PAT-03 |
| EC-02 | Menor | Estado de Cuenta / Prueba de Exportación / PreAlerta / PagoOnline | accesibilidad | Los grids DevExpress se renderizan sin semántica de tabla accesible: las cabeceras son <td class=dxgvHeader> (0 <th>, sin scope, sin caption/role), la fila de totales de Estado no lleva etiqueta ('... | PAT-09 |
| MC-12 | Menor | Mi Cuenta > Dependientes / Direccion | accesibilidad | Los grids DevExpress no tienen semántica de tabla accesible: las cabeceras son <td class=dxgvHeader_Moderno> (0 <th>), cada cabecera anida otra <table> (8 tablas anidadas en Dependientes), sin capt... | PAT-09 |
| RA-06 | Menor | Rastreo (grid #cpBody_gvDatos) y Adjuntos (#gvDatos) | accesibilidad | Las cabeceras de los grids se renderizan como <td class="dxgvHeader_Office365"> (0 <th>, 0 scope, sin role en la tabla), por lo que los lectores de pantalla no asocian cabecera y celda; las filas d... | PAT-09 |
| SH-04 | Menor | Chrome compartido (sidebar) | ux-ui | El indicador de página activa del sidebar es incorrecto en 3 de 6 pantallas: en Estado.aspx ningún ítem aparece activo; en PruebaExportacion.aspx queda marcado 'Rastreo'; en PagoOnline.aspx ninguno... | PAT-24, PAT-27 |
| EC-01 | Menor | Estado de Cuenta / Prueba de Exportación | ux-ui | Los listados de facturas (Estado) y de paquetes (Prueba de Exportación) no ofrecen filtro por periodo/estado, búsqueda ni paginación. Con 3 y 4 filas no molesta, pero la pantalla 'Consulta Estados ... *(confirmación pendiente: cuenta de prueba con solo 3–4 filas, sin dataset de alto volumen ni filtro de fechas para forzarlo)* | PAT-37 |
| PA-08 | Menor | PreAlerta | ux-ui | El select de transportista no tiene opción 'Seleccionar…': carga con 'UPS' preseleccionado (value=2) y required se cumple sin que el usuario elija, por lo que una pre-alerta enviada sin tocar el ca... | PAT-39 |

## Acciones destructivas detectadas y no ejecutadas

Por la regla de oro de la auditoría (ninguna acción irreversible sobre datos
reales), estos controles se identificaron pero nunca se dispararon hasta el
final. Detalle completo en `audit/findings/destructive-actions-detected.md`.

1. **PreAlerta.aspx — "Envia tu Factura"**: crearía una pre-alerta real
   ligada a la cuenta DP-014003 y subiría un archivo como factura adjunta.
   No hay forma confirmada de revertirla sin riesgo de efectos secundarios
   (notificación a personal, procesamiento posterior).
2. **PagoOnline.aspx — flujo "Pagar Con"**: iniciaría un flujo de pago real
   (posiblemente contra una pasarela de pago real). Solo se abrió el
   desplegable vacío (sin paquete seleccionado); no se avanzó más.

El botón "Salir" (logout) se identificó pero no se trata como acción
destructiva: es reversible (basta con volver a iniciar sesión).

## Patrones prioritarios para el rediseño (top 8)

Estos son los patrones — no hallazgos individuales — que conviene resolver
primero, porque cada uno colapsa un número grande de hallazgos dispersos en
una sola pieza reutilizable, un arreglo de servidor, o una convención nueva.

1. **PAT-15 — No existe capa de validación en cliente** (8 hallazgos: LG-03,
   NC-03, NC-06, MC-06, PA-04, RA-03, RA-10, y más; severidad máxima crítica
   vía `RA-03`). Justificación: es la causa detrás del 500 crudo de
   `RA-03` y de que formularios enteros (Login, Nueva Cuenta, Mi Cuenta,
   PreAlerta) dependan solo de `required` nativo o de nada. Para el
   rediseño implica un esquema de validación de cliente compartido
   (p. ej. una librería de esquema + componente de error) antes de que
   cualquier formulario nuevo se construya.
2. **PAT-20 — No hay sistema de mensajería de la aplicación** (8 hallazgos:
   LG-04, NC-04, NC-14, MC-05, RA-10, SH-05, y más; severidad máxima crítica
   vía `RA-03`). Justificación: hoy el feedback al usuario es silencio,
   `alert()`, SweetAlert2 con icono incoherente (`LG-04`), o una página de
   error cruda de ASP.NET. El rediseño necesita un único componente de
   toast/banner/diálogo de confirmación, con severidad y copy consistentes.
3. **PAT-13 — Errores 500 crudos de ASP.NET expuestos al usuario**
   (5 hallazgos: RA-03, LG-05, LG-13, PO-01, RA-15; severidad máxima
   crítica). Justificación: es un arreglo de servidor, no de componente —
   cualquier entrada inesperada (fecha imposible, caracteres especiales,
   parámetro `cl` ausente) debe devolver una página de error controlada, no el
   stack trace de ASP.NET. Bloqueante para cualquier lanzamiento público.
4. **PAT-14 — Estado de servidor frágil y compartido entre los grids
   "gvDatos"** (3 hallazgos: RA-09, PO-01, RA-20; severidad máxima crítica).
   Justificación: el grid principal de Rastreo se vacía con un simple
   ordenar/plegar (`RA-09`), y el mismo estado de sesión deja PagoOnline en
   500 tras visitar otra pantalla (`PO-01`) — es un problema de arquitectura
   de servidor (estado compartido/callback), no de una pantalla aislada.
5. **PAT-01 — Etiquetas no asociadas: el placeholder hace de etiqueta**
   (10 hallazgos: LG-01, MC-01, MC-15, NC-01, NC-02, PA-01, RA-02, EC-07,
   MC-19, NC-17). Justificación: aparece en las 5 pantallas con formulario
   del portal; es el ejemplo más claro de "no existe un componente de campo".
   El rediseño debe introducir un componente Campo único (label + control +
   ayuda + error) que emita siempre `<label for>` y estado accesible.
6. **PAT-08 — La paleta del tema no alcanza el contraste mínimo** (11
   hallazgos: EC-07, MC-16, PO-04, LG-11, NC-17, RA-19, MC-02, SH-03, y más).
   Justificación: es el patrón con más hallazgos de accesibilidad después de
   PAT-31; el rojo de marca (`#ea3537`) y los grises de apoyo fallan AA de
   forma sistemática. Corregirlo es un cambio de tokens de color, no de
   componente por componente, y desbloquea buena parte de los hallazgos de
   contraste listados individualmente.
7. **PAT-02 — Controles solo-icono sin nombre accesible** (9 hallazgos:
   EC-04, RA-05, SH-02, RA-07, SH-01, PE-03, y más). Justificación: el
   hamburguesa, el menú de usuario, el icono de imprimir y los toggles de
   grid comparten el mismo defecto en pantallas distintas — de nuevo,
   ausencia de un componente IconButton con `aria-label` obligatorio por
   contrato, no un fix ad hoc por icono.
8. **PAT-31 — Localización incompleta: `lang="en"` y textos del framework en
   inglés** (13 hallazgos — el patrón más grande del informe: LG-11, LG-12,
   MC-09, MC-11, NC-15, NC-17, PA-10, PA-12, RA-11, EC-07, MC-19, y más).
   Justificación: por volumen es el patrón #1; corregir `lang` a `es` y
   sustituir los textos por defecto de DevExpress/el navegador por copy en
   español es una convención de una sola vez (plantilla + diccionario de
   strings) que resuelve más hallazgos individuales que ningún otro cambio
   del informe.

## Correcciones a fases anteriores

Estas observaciones de Fase 1 (inspección estática, sin ejecutar) no se
confirmaron al ejecutar el caso real en Fase 4 y se corrigen aquí para que
este informe no contradiga los resúmenes de fase previos:

- **Los iconos "Imprimir" de Prueba de Exportación sí funcionan.** Fase 1/2
  interpretó el `ASPx.AddDisabledItems(...)` inline como un estado
  deshabilitado; en ejecución real no hay clase `dxbDisabled` y las 4 filas
  descargan un PDF de guía aérea válido. El hallazgo relacionado (`PE-03`)
  es solo sobre el nombre accesible ("Clone"), no sobre que el control esté
  roto. Lo mismo aplica al flujo de PDF de Estado de Cuenta: funciona
  correctamente (3/3 facturas, total coincide con el grid).
- **El popup "Movimientos del Paquete" sí tiene botón de cierre visible.**
  Fase 1 lo anotó como ausente; en Fase 4 se confirmó `#cpBody_ppCambioGuia_HCB-1`
  (28×28 px) y que Esc también cierra el popup. El problema real documentado
  en `RA-13`/`RA-18` es el acceso por teclado y el tamaño fijo del popup en
  móvil, no la ausencia del botón.
