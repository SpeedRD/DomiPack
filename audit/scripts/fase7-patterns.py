#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fase 7 — Detección de patrones sistémicos.

Agrupa los 105 hallazgos de audit/findings/findings.json por causa raíz común
(no por categoría ni por texto literal), genera audit/patterns/patterns.json y
escribe patron_relacionado (lista de ids de patrón) en cada hallazgo.

Los hints patron_sugerido_fase7 escritos por los workers de Fase 4 se retiran de
findings.json y se conservan en patterns.json (trazabilidad_hints_fase4) para no
duplicar la misma información en dos sitios.
"""
import json, collections, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parents[1]
FINDINGS = ROOT / "findings" / "findings.json"
PATTERNS = ROOT / "patterns" / "patterns.json"

PANTALLAS = {
    "EC": "Estado de Cuenta",
    "LG": "Login / Acceso",
    "MC": "Mi Cuenta",
    "NC": "Nueva Cuenta",
    "PA": "PreAlerta",
    "PE": "Prueba de Exportación",
    "PO": "PagoOnline",
    "RA": "Rastreo (+ modales y Adjuntos)",
    "SH": "Chrome compartido (header/sidebar/footer)",
}

# (id, familia, nombre, descripcion, componentes, implicacion_diseno, hallazgos, origen)
# origen: "hint-confirmado"  -> algún worker lo sugirió y se verificó en el dataset completo
#         "hint-fusionado"   -> varios hints describían el mismo patrón; se consolidan
#         "solo-transversal" -> no era visible desde un único grupo de pantallas
P = [
(
 "PAT-01", "Formularios y accesibilidad",
 "Etiquetas no asociadas: el placeholder hace de etiqueta",
 "Ningún formulario del portal asocia programáticamente su etiqueta con el control: las etiquetas "
 "son texto suelto o <label> sin for, y el nombre real del campo lo aporta el placeholder, que "
 "desaparece al escribir. Los selects y las casillas quedan directamente sin nombre accesible "
 "(axe select-name y label como críticos en Mi Cuenta, Nueva Cuenta y PreAlerta). Es el mismo "
 "defecto en las 5 pantallas con formulario, tanto en la plantilla pública (Login, Nueva Cuenta) "
 "como en la autenticada, lo que apunta a que no existe un componente de campo de formulario: "
 "cada pantalla dibuja etiqueta e input por separado.",
 "#lUser/#lPass; todos los campos de MiCuenta (Datos Personales, Dependientes, Direccion); los 14 "
 "controles de NuevaCuenta; #cpBody_Tracking/#cpBody_FOB/#cpBody_Transpos/#cpBody_File1 y demás de "
 "PreAlerta; #cpBody_lDesde/#cpBody_lHasta del modal Historial Guías; checkboxes #cpBody_ckPrincipal, "
 "#ckDomicilio, #ckRua.",
 "Un único componente Campo (label + control + ayuda + error) que emita siempre <label for=id>, "
 "id estable, aria-describedby para la ayuda y aria-invalid/aria-errormessage para el error. El "
 "placeholder pasa a ser ejemplo de formato, nunca el nombre del campo. Sin este componente, cada "
 "pantalla reintroducirá el defecto.",
 ["LG-01","MC-01","MC-15","NC-01","NC-02","PA-01","RA-02","EC-07","MC-19","NC-17"],
 "hint-fusionado",
),
(
 "PAT-02", "Formularios y accesibilidad",
 "Controles solo-icono sin nombre accesible (o con el nombre interno del control)",
 "Todos los controles que se representan con un icono carecen de nombre accesible o exponen un "
 "identificador interno: los iconos PDF de Estado son <div> con <img alt=''> cuyo único elemento "
 "enfocable es un <input value='submit'> de 0×0 px; el botón Imprimir de Prueba de Exportación "
 "anuncia 'Clone' (el id del CustomButton) aunque su tooltip diga 'Imprimir'; en Rastreo el clip, "
 "los toggles de grupo/detalle y el botón Post-Alerta repiten el patrón (alt vacío, alt='Clone', "
 "enlace llamado '0'); y en el chrome compartido las tres hamburguesas y el disparador del menú de "
 "usuario tienen nombre ''. axe lo reporta como button-name / image-alt críticos en todas las "
 "pantallas autenticadas.",
 "#cpBody_gvDatos_cell*_iPrint_* (Estado); a.dxgv__cci y a.dxgvADSB (Prueba de Exportación); "
 "DXCBtn0/DXCBtn1, img Clip.png y toggles dxGridView_gv*Button (Rastreo); button.close-sidebar-btn, "
 "button.mobile-toggle-nav, button.mobile-toggle-header-nav y <a data-toggle=dropdown> (chrome).",
 "Componente BotónIcono obligatorio en el sistema de diseño: icono decorativo (aria-hidden) + "
 "etiqueta textual accesible derivada del dato de la fila ('Descargar factura FT33-006983'), "
 "tooltip y nombre accesible siempre iguales, y elemento <button> real (ver PAT-21). Definir además "
 "la plantilla de nombres para las acciones de fila de los grids DevExpress, donde hoy el alt lo "
 "genera el framework.",
 ["EC-04","EC-07","MC-19","PE-03","RA-05","RA-07","RA-19","SH-01","SH-02"],
 "hint-confirmado",
),
(
 "PAT-03", "Formularios y accesibilidad",
 "El tema anula el indicador de foco (outline:none) en la mayoría de controles",
 "La navegación con teclado es prácticamente invisible: enlaces del sidebar, hamburguesa, enlaces "
 "del footer, enlaces de los grids, casillas de verificación y los enlaces secundarios del login no "
 "cambian de aspecto al recibir el foco (outline:none, sin box-shadow ni cambio de color); el botón "
 "Guardar tiene box-shadow con spread 0px (invisible) y el icono PDF de Estado desplaza el foco a un "
 "input de 0×0 px. Solo inputs de texto y pestañas muestran algo. Afecta por igual a la plantilla "
 "pública y a la autenticada, luego el origen es el CSS del tema (Architect UI), no cada pantalla.",
 "#lRastreo y demás enlaces del sidebar, .close-sidebar-btn, .app-footer a, .btn-primary; enlaces de "
 "#cpBody_gvDatos (VerGuia, Adjuntos, DXCBtn0); #checkbox-signup, #ckDomicilio, #ckRua; enlaces "
 "'Recuperar mi Contraseña?' y 'Crear Cuenta Gratis'.",
 "Definir un token de foco único (:focus-visible con anillo de 2–3 px y contraste ≥3:1 sobre "
 "cualquier fondo del tema) aplicado globalmente y prohibir outline:none sin sustituto. Es una "
 "corrección de una sola regla en el sistema de diseño, no un arreglo por pantalla.",
 ["EC-04","LG-10","MC-08","NC-13","RA-08"],
 "hint-confirmado",
),
(
 "PAT-04", "Formularios y accesibilidad",
 "Orden de tabulación roto por tabindex positivos y elementos enfocables invisibles",
 "Las dos pantallas con formularios largos usan tabindex positivos (Nueva Cuenta 1..10 con índices "
 "repetidos, PreAlerta 1/2/2/4/2/5/2) y el resultado es un recorrido que no coincide con el orden "
 "visual: en PreAlerta el foco salta de Valor Declarado a Suplidor, luego al selector de archivo y "
 "después al transportista; en Nueva Cuenta, Sexo y las dos casillas se enfocan después del botón "
 "'Crear Cuenta'. En Mi Cuenta queda un tabindex=8 residual en #cpBody_cbPais. A esto se suman "
 "elementos enfocables de 0×0 px (los inputs ocultos de los iconos PDF). axe: regla 'tabindex' "
 "serious en 7 y 12 nodos.",
 "#ddTipo…#ckRua (Nueva Cuenta), #cpBody_Tracking…#cpBody_bSend (PreAlerta), #cpBody_cbPais "
 "(Mi Cuenta > Direccion), inputs de 0×0 px de los iconos PDF (Estado).",
 "Regla de sistema: cero tabindex positivos; el orden de tabulación lo define el orden del DOM y el "
 "layout se resuelve con CSS. Cualquier elemento enfocable debe ser visible y tener tamaño; los "
 "controles auxiliares del framework deben quedar fuera del recorrido (tabindex=-1).",
 ["EC-04","MC-19","NC-13","NC-17","PA-11"],
 "hint-confirmado",
),
(
 "PAT-05", "Formularios y accesibilidad",
 "Diálogos sin semántica de diálogo, sin gestión del foco y mal apilados",
 "Ninguna de las tres superficies modales del portal se comporta como un diálogo: el modal "
 "'Historial Guías' se abre sin mover el foco, no atrapa el tabulador (Tab recorre antes el grid de "
 "fondo), Esc no cierra hasta que el foco entra, al cerrar el foco cae en <body>, no declara "
 "role=dialog y su × no tiene nombre; además su cabecera queda por debajo de la barra superior fija "
 "(el × es inclicable en su mayor parte y a 375 px desaparece por completo). El popup 'Movimientos "
 "del Paquete' no tiene ningún elemento enfocable (su cierre es un <div>) y mide 1000×600 px fijos, "
 "por lo que a 375/768 px el cierre queda fuera del viewport. Y donde sí correspondería un diálogo "
 "(Adjuntos) se abre en cambio una pestaña desnuda.",
 "#modal_Historial (Bootstrap), cpBody_ppCambioGuia (ASPxPopupControl), dlg/Adjuntos.aspx.",
 "Un único componente Diálogo para todo el portal: role=dialog + aria-modal + aria-labelledby, foco "
 "inicial al abrir y devuelto al disparador al cerrar, trampa de foco, Esc siempre, botón de cierre "
 "<button aria-label='Cerrar'>, ancho relativo con máximo y z-index por encima del header fijo. Todo "
 "contenido secundario (Adjuntos, Movimientos, Historial) usa ese componente en lugar de popups del "
 "framework o pestañas nuevas.",
 ["RA-12","RA-13","RA-14","RA-18"],
 "hint-confirmado",
),
(
 "PAT-06", "Accesibilidad estructural",
 "Documentos sin estructura: ni landmarks, ni h1, contenido fuera de regiones",
 "Las 8 pantallas auditadas incumplen a la vez landmark-one-main, page-has-heading-one y region: no "
 "hay <main> ni <nav>, ningún documento tiene <h1> (los títulos visibles son divs con clase) y entre "
 "6 y 30 bloques quedan fuera de cualquier landmark. La página auxiliar de Adjuntos añade "
 "document-title vacío. Es el mismo defecto en la plantilla pública y en la master page "
 "autenticada, así que ninguna pantalla lo resuelve por su cuenta.",
 "Login.aspx, NuevaCuenta.aspx, Estado.aspx, PruebaExportacion.aspx, PreAlerta.aspx, PagoOnline.aspx, "
 "MiCuenta.aspx, Rastreo.aspx, dlg/Adjuntos.aspx.",
 "Definir el esqueleto de página del rediseño (skip link → <header> → <nav> → <main> con el <h1> de "
 "la pantalla → <footer>) en la plantilla, con el <h1> alimentado por el título de la pantalla y un "
 "<title> por página. Es un cambio en dos plantillas, no en diez pantallas.",
 ["EC-07","LG-11","MC-19","NC-17","RA-14","RA-19"],
 "solo-transversal",
),
(
 "PAT-07", "Accesibilidad estructural",
 "Zoom bloqueado en móvil en toda la zona autenticada",
 "La master page autenticada declara <meta name='viewport' … maximum-scale=1, user-scalable=no>, lo "
 "que impide ampliar la página en móvil en Estado, Prueba de Exportación, PreAlerta, PagoOnline, "
 "Mi Cuenta y Rastreo (axe meta-viewport). Justo donde el contenido es más denso (grids con texto "
 "pequeño y contraste bajo) el usuario no puede acercarse. Las pantallas públicas (Login, Nueva "
 "Cuenta) no llevan esa restricción, lo que confirma que procede de una única plantilla.",
 "<meta name=viewport> de la master page de todas las pantallas autenticadas.",
 "Eliminar maximum-scale/user-scalable de la plantilla y no volver a introducirlos; el layout "
 "responsive debe soportar zoom hasta 200 % (WCAG 1.4.4). Corrección de una línea con efecto en 6 "
 "pantallas.",
 ["EC-07","MC-19","RA-19"],
 "solo-transversal",
),
(
 "PAT-08", "Sistema visual",
 "La paleta del tema no alcanza el contraste mínimo (rojo #ea3537 y grises claros)",
 "El contraste insuficiente no es un descuido puntual: son los dos colores estructurales del tema. "
 "El rojo corporativo #ea3537 sobre blanco da 4.14:1 en los enlaces del sidebar y en el botón "
 "principal (4.15:1 en blanco sobre rojo), y cuando se usa como fondo de cabeceras de grid o de "
 "selects produce 3.92:1 y hasta un caso ilegible en PagoOnline a 1440 px; los grises de texto "
 "secundario (#909499, #8e8e93, #a2a6aa, #98a4b9) dan entre 2.36:1 y 2.98:1 en subtítulos, footer, "
 "totales y etiquetas; los controles deshabilitados (opacity .7) bajan a 2.11:1. axe cuenta 14–23 "
 "nodos por pantalla.",
 "Enlaces y encabezado del sidebar, .page-title-subheading, .app-footer a, #llocalidad, botones "
 ".btn-primary, cabeceras de #cpBody_gvDatos (Office365 y Moderno), selects de Mi Cuenta > Direccion, "
 "footer de totales de Estado, etiquetas grises de Nueva Cuenta, dlg/Adjuntos.aspx.",
 "Rehacer la paleta como sistema de tokens con contraste verificado: variante accesible del rojo "
 "para texto/enlaces sobre blanco, uso del rojo de marca reservado a superficies con texto blanco "
 "de tamaño suficiente, escala de grises con un mínimo de 4.5:1 para texto secundario y un estilo "
 "de deshabilitado que no dependa de opacity. Validar la paleta una vez, no pantalla a pantalla.",
 ["EC-07","LG-11","MC-02","MC-13","MC-16","MC-19","NC-17","PO-04","RA-14","RA-19","SH-03"],
 "hint-confirmado",
),
(
 "PAT-09", "Tablas y listados",
 "Los grids DevExpress no tienen semántica de tabla accesible",
 "Las seis instancias de ASPxGridView del portal (Estado, Prueba de Exportación, PreAlerta, "
 "PagoOnline, Dependientes, Direccion, Rastreo y Adjuntos) se renderizan con 0 <th>: las cabeceras "
 "son <td class=dxgvHeader_*> sin scope, la tabla no tiene role ni caption ni aria-label, cada "
 "cabecera anida otra <table> (8 tablas anidadas en Dependientes) y las filas de grupo y de totales "
 "no son anunciables. La fila de totales de Estado se emite sin etiqueta ni moneda y el footer de "
 "PagoOnline muestra 'DOP$: 0.000' sin decir qué totaliza.",
 "#cpBody_gvDatos (Estado, Prueba, PreAlerta, PagoOnline, Rastreo), #cpBody_gvDependientes, "
 "#cpBody_gvDireccion, #cpBody_gvTarjetas (oculto), #gvDatos (Adjuntos).",
 "Decidir a nivel de proyecto el futuro del control de grid: o se configura DevExpress para emitir "
 "cabeceras semánticas y se le añade caption/aria-label y etiquetas de fila de totales, o el "
 "rediseño adopta un componente Tabla propio (<table> con <th scope=col>, caption, fila de totales "
 "etiquetada y acciones de fila con nombre). Afecta a las 8 pantallas con listado a la vez.",
 ["EC-02","MC-12","PO-02","RA-06"],
 "hint-fusionado",
),
(
 "PAT-10", "Responsive",
 "Desbordamiento horizontal en móvil por componentes de ancho fijo",
 "El portal no tiene una estrategia de contención horizontal: los grids que no activan el modo "
 "adaptativo de DevExpress (Estado, Dependientes, Direccion) desbordan el documento (931 px en un "
 "viewport de 375 px; 823 px a 768 px) sin que ningún ancestro tenga overflow-x, el que sí lo activa "
 "aún sobresale 3 px del card (Prueba de Exportación), el popup de Movimientos tiene 1000×600 px "
 "fijos y saca su botón de cierre fuera de pantalla, y en Login el .accountbg absoluto se extiende "
 "hasta 1950 px (oculto solo por overflow-x:hidden del html). El mismo componente se comporta "
 "distinto según la pantalla, lo que confirma que es configuración ad hoc y no una regla.",
 "#cpBody_gvDatos (Estado, Prueba), #cpBody_gvDependientes/#cpBody_gvDireccion, cpBody_ppCambioGuia, "
 ".accountbg y la tarjeta de Login, select #cpBody_lSucursal.",
 "Regla global: ningún elemento fuera del flujo; todo contenido ancho (tabla, popup, imagen) vive en "
 "un contenedor con overflow-x:auto y max-width:100 %, y los diálogos usan ancho relativo con "
 "máximo. Para los listados, definir una única pauta móvil (columnas prioritarias + detalle "
 "expandible) aplicada a todos los grids por igual.",
 ["EC-03","LG-14","MC-18","PE-01","RA-18"],
 "hint-confirmado",
),
(
 "PAT-11", "Responsive",
 "Objetivos táctiles por debajo del mínimo",
 "Los controles pensados para el ratón se sirven igual en móvil: los tres controles del header miden "
 "24×21, 22×21 y 23×29 px; las casillas del portal 13×13 px (Login, Nueva Cuenta) y los enlaces "
 "secundarios del login 17 px de alto. No hay ningún tamaño mínimo definido en el tema.",
 "Hamburguesa y ⋮ del header, disparador del menú de usuario, #checkbox-signup, #ckDomicilio, #ckRua, "
 "enlaces 'Recuperar mi Contraseña?' y 'Crear Cuenta Gratis'.",
 "Token de área táctil mínima (44×44 px, 24×24 px como suelo absoluto) aplicado a botones, casillas y "
 "enlaces de acción del sistema de diseño, con área ampliada por pseudo-elemento cuando el icono deba "
 "seguir siendo pequeño.",
 ["LG-14","MC-18","NC-16"],
 "solo-transversal",
),
(
 "PAT-12", "Contenido y estados",
 "Estados vacíos genéricos, en inglés y sin salida",
 "Todos los listados sin datos muestran el texto por defecto de DevExpress 'No data to display' (y "
 "'Loading…' durante los callbacks) sobre cabeceras rojas, sin explicar qué falta ni qué hacer. El "
 "mismo texto sirve para 'aún no tienes pre-alertas', 'esta guía no tiene adjuntos' y 'tu filtro no "
 "devolvió resultados', de modo que el usuario no distingue un listado vacío de una búsqueda sin "
 "coincidencias (Rastreo, rango invertido) ni sabe cómo limpiar el filtro.",
 "#cpBody_gvDatos_DXEmptyRow (PreAlerta, Rastreo), #cpBody_gvDependientes/#cpBody_gvDireccion "
 "DXEmptyRow (Mi Cuenta), #gvDatos de dlg/Adjuntos.aspx.",
 "Componente EstadoVacío con tres variantes —sin datos todavía (con CTA: 'Crea tu primera "
 "pre-alerta'), sin resultados para el filtro (con el filtro aplicado visible y acción 'Quitar "
 "filtro') y error de carga— en español y con ilustración/icono. Nunca dejar que el framework escriba "
 "el mensaje.",
 ["MC-11","PA-10","RA-10","RA-11","RA-14"],
 "hint-fusionado",
),
(
 "PAT-13", "Robustez de servidor",
 "Errores 500 crudos de ASP.NET expuestos al usuario",
 "En cinco situaciones distintas —y en cuatro pantallas que ningún worker comparó entre sí— la "
 "aplicación devuelve la página amarilla 'Server Error in / Application – Runtime Error' en inglés, "
 "sin navegación de vuelta y perdiendo todo el contexto del portal: caracteres especiales en el "
 "usuario o la contraseña del login; buscar en 'Historial Guías' con las fechas vacías (crítico, "
 "está a un clic del flujo normal); abrir dlg/Adjuntos.aspx sin los parámetros o con caracteres "
 "especiales; acceder a dlg/Adjuntos.aspx sin sesión (donde el resto de rutas redirigen a Login); y "
 "PagoOnline.aspx tras haber visitado Estado o Mi Cuenta en la misma sesión. La causa común es que "
 "no hay una capa de manejo de errores: ni validación previa, ni try/catch, ni página de error "
 "propia (customErrors=RemoteOnly deja la del framework).",
 "Login.aspx (POST), Rastreo.aspx (POST del filtro), dlg/Adjuntos.aspx (GET con y sin sesión), "
 "PagoOnline.aspx (GET).",
 "Tres decisiones de arquitectura para el rediseño: (1) página de error propia, en español, dentro "
 "del chrome del portal y con acción de vuelta, para cualquier 4xx/5xx; (2) validación de entradas y "
 "de parámetros de ruta antes de llegar a la capa de datos, devolviendo mensajes de aplicación; "
 "(3) redirección a Login coherente para todas las rutas protegidas. Ninguna pantalla debe poder "
 "sacar al usuario del portal.",
 ["LG-05","LG-13","PO-01","RA-03","RA-15"],
 "solo-transversal",
),
(
 "PAT-14", "Robustez de servidor",
 "Estado de servidor frágil y compartido entre los grids 'gvDatos'",
 "Tres hallazgos de grupos distintos apuntan al mismo mecanismo: el estado del grid vive en el "
 "servidor y se contamina entre pantallas. En Rastreo, cualquier callback del grid (ordenar por "
 "cabecera o plegar el grupo de estatus) devuelve 200 con 0 filas y el grid queda vacío hasta "
 "recargar —crítico, y contrasta con Estado, donde ordenar sí funciona en 8/8 cabeceras—. "
 "PagoOnline.aspx pasa a 500 de forma determinista una vez que en la sesión se ha visitado Estado o "
 "Mi Cuenta, y ambas pantallas registran su grid con el mismo nombre de cliente 'gvDatos'. Y el "
 "filtro de Rastreo se guarda en sesión: tras filtrar, el histórico persiste al volver, recargar o "
 "navegar de nuevo a Rastreo.",
 "ASPx.createControl(ASPxClientGridView,'cpBody_gvDatos','gvDatos') en Estado, PagoOnline, Rastreo, "
 "PreAlerta y Prueba de Exportación; estado de filtro en sesión de Rastreo.",
 "El rediseño no debe apoyarse en estado de grid en sesión: filtro, orden y paginación viajan en la "
 "URL (parámetros enlazables y compartibles) y el listado se recarga desde ellos. Si se conserva "
 "DevExpress, los grids necesitan nombres de cliente únicos por pantalla y la reproducción del 500 "
 "de PagoOnline debe cerrarse antes de cualquier trabajo de UI sobre el flujo de pago.",
 ["PO-01","RA-09","RA-20"],
 "solo-transversal",
),
(
 "PAT-15", "Validación",
 "No existe capa de validación en cliente: mensajes nativos del navegador o silencio",
 "Ningún formulario del portal define validación propia: window.Page_Validators no existe, no hay "
 "onsubmit ni JS de validación, y lo único que actúa es el required nativo, cuyos mensajes los pone "
 "el navegador y en la sesión probada aparecían en inglés ('Please fill out this field.'). Donde ni "
 "eso hay, el envío se produce y el resultado es silencio (login con contraseña vacía recarga sin "
 "mensaje) o un 500 (Buscar con fechas vacías). El correo de confirmación no se compara con el "
 "principal, y un rango de fechas invertido se acepta sin aviso.",
 "Login (#lPass sin required), Mi Cuenta (los 16 campos de las tres pestañas), Nueva Cuenta "
 "(asteriscos que no se corresponden con required), PreAlerta (solo required nativo), modal "
 "Historial Guías (sin validación de fechas).",
 "Una capa de validación de formularios compartida: reglas declarativas por campo, validación al "
 "salir del campo y al enviar, mensajes propios en español junto al campo (no burbujas del "
 "navegador), resumen de errores enfocable al principio del formulario y bloqueo del envío. El "
 "servidor repite todas las reglas; el cliente nunca es la única defensa.",
 ["LG-03","MC-06","NC-03","NC-06","PA-03","PA-04","RA-03","RA-10"],
 "hint-fusionado",
),
(
 "PAT-16", "Validación",
 "Campos sin la semántica HTML de su tipo de dato (email, teléfono, número, fecha, archivo)",
 "Los datos con formato conocido se capturan como texto libre: correos y teléfonos son "
 "input type=text sin pattern, inputmode ni autocomplete (Mi Cuenta acepta 'abc', 'a@@x.com', "
 "'a@x.com.'); los teléfonos aceptan letras, símbolos y 60 dígitos; un placeholder promete la "
 "máscara '+99-99-9999-9999' que no existe; la fecha de nacimiento no tiene min/max (2035 y 1900 son "
 "válidos); el valor declarado en USD es number sin min/max/step, admite negativos, cero, notación "
 "científica y 20 dígitos; el tracking no tiene formato ni relación con el transportista; y el input "
 "de factura no declara accept ni límite de tamaño. En móvil, ningún campo numérico abre el teclado "
 "adecuado.",
 "#cpBody_lEmail*, #cpBody_lTelefono*, #cpBody_lCelular* (Mi Cuenta); #Email/#Email1, #ltelefono, "
 "#lcelular, #tbFecha (Nueva Cuenta); #cpBody_FOB, #cpBody_Tracking, #cpBody_File1 (PreAlerta); "
 "#lUser/#lPass sin autocomplete (Login).",
 "Catálogo de tipos de campo del sistema de diseño: correo, teléfono (con prefijo y máscara del "
 "país), moneda (2 decimales, min>0), fecha (con rango plausible), tracking (formato por "
 "transportista) y archivo (accept + tamaño máximo visible). Cada tipo trae type/inputmode/"
 "autocomplete/pattern y su mensaje de error; los formularios se componen con ellos.",
 ["LG-02","MC-03","MC-10","NC-05","NC-07","NC-09","PA-06","PA-07","PA-09"],
 "hint-fusionado",
),
(
 "PAT-17", "Validación",
 "Sin límites de longitud ni normalización: espacios y cadenas enormes se aceptan",
 "Ningún campo de texto del portal declara maxlength y el required nativo no hace trim, de modo que "
 "'   ' cuenta como contenido válido en Login, Nueva Cuenta, Mi Cuenta y PreAlerta, y se aceptan en "
 "cliente 5.000 y 100.000 caracteres (y 10.000 en los campos de contraseña) sin aviso ni contador. "
 "Lo que llegue al servidor es desconocido: los envíos no se ejercitaron por ser destructivos.",
 "16 campos de Mi Cuenta, #cpBody_Tracking/#cpBody_Suplidor/#cpBody_contenido (PreAlerta), "
 "#lUser/#lPass (Login), #Nombre/#Password (Nueva Cuenta).",
 "Definir por campo la longitud máxima coherente con la base de datos y mostrarla (contador cuando "
 "el límite sea significativo), normalizar con trim antes de validar y enviar, y rechazar valores "
 "que solo contengan espacios. Debe formar parte del componente Campo (PAT-01), no de cada pantalla.",
 ["LG-03","MC-04","MC-06","NC-03","NC-08","PA-04","PA-05"],
 "hint-confirmado",
),
(
 "PAT-18", "Cuenta y credenciales",
 "Gestión de credenciales incompleta en las tres pantallas que la tocan",
 "El portal trata la contraseña como un campo de texto más: no hay política visible ni técnica "
 "(sin minlength, sin medidor, se aceptan solo espacios y 10.000 caracteres), no hay confirmación, "
 "no hay mostrar/ocultar en ninguna de las tres pantallas, y falta autocomplete "
 "(username/current-password/new-password), con el riesgo añadido en Mi Cuenta de que el gestor del "
 "navegador rellene el campo 'Nueva Contraseña' y un Guardar la cambie sin intención. La "
 "recuperación no tiene pantalla propia: 'Recuperar mi Contraseña?' dispara un submit oculto del "
 "mismo formulario sin decir qué dato usa ni a dónde enviará nada. Y 'Remember me' viene marcada por "
 "defecto pero no tiene atributo name, así que nunca viaja en el POST.",
 "#lPass y #checkbox-signup y enlace Recuperar (Login), #cpBody_lContrasena (Mi Cuenta), #Password "
 "(Nueva Cuenta).",
 "Tratar credenciales como un flujo con sus propios patrones: campo de contraseña con "
 "mostrar/ocultar y política visible, cambio de contraseña como bloque explícito (actual + nueva + "
 "confirmación, o 'déjalo en blanco para no cambiarla'), recuperación como pantalla propia con "
 "confirmación y mensaje neutro, y persistencia de sesión real o retirada del control.",
 ["LG-02","LG-06","LG-17","MC-04","NC-08"],
 "solo-transversal",
),
(
 "PAT-19", "Feedback de acciones",
 "Acciones que escriben o tardan, sin confirmación, sin bloqueo de doble envío y sin progreso",
 "Ninguna acción del portal protege ni acompaña al usuario. El login correcto tarda 17–18 s sin "
 "spinner, sin deshabilitar el botón y sin cambiar de texto; 'Buscar' del modal dispara dos POST con "
 "un doble clic; los tres botones Guardar de Mi Cuenta, 'Crear Cuenta' y 'Envia tu Factura' (que "
 "crea un registro real y sube un archivo) son submits sin onclick, sin confirmación, sin "
 "deshabilitado-al-enviar y sin indicador; la descarga de una factura tarda ~4 s mostrando solo el "
 "panel de carga de DevExpress. Existe un helper Confirmar() en varias páginas, pero no está "
 "conectado a ningún botón (y donde se usaría, está roto: ver PAT-28).",
 "#cpBody_Button1/#cpBody_Button3/#cpBody_bDireccion (Mi Cuenta), #bSend (Nueva Cuenta), "
 "#cpBody_bSend (PreAlerta), Buscar del modal Historial (Rastreo), Entrar (Login), iconos PDF "
 "(Estado).",
 "Convención única de acción: botón con estado ocupado (deshabilitado + texto 'Guardando…' + "
 "spinner) desde el clic hasta la respuesta, protección de reenvío en cliente y servidor "
 "(idempotencia), y diálogo de confirmación reservado a las acciones con efecto irreversible. "
 "Definir además un umbral de latencia a partir del cual se muestra progreso.",
 ["EC-05","LG-08","MC-05","NC-14","PA-03","RA-04"],
 "hint-fusionado",
),
(
 "PAT-20", "Feedback de acciones",
 "No hay sistema de mensajería de la aplicación: silencio, alert() o diálogos incoherentes",
 "El portal no tiene una forma propia de decir qué pasó. Un login con la contraseña vacía recarga "
 "sin mensaje alguno; el error de credenciales sí usa SweetAlert pero con el icono 'i' de "
 "información y el título 'Error!'; la consulta de cédula escribe literalmente '[]' en el campo "
 "Nombre cuando el web service no encuentra nada y habilita todos los campos sin avisar, y si la "
 "llamada falla el callback de error está vacío (los campos quedan bloqueados sin explicación) "
 "mientras la verificación RUA muestra alert('[object Object]'); el checkout usa alert('error'); un "
 "rango de fechas invertido no dice nada y un fallo del filtro saca la página de error del "
 "framework. Coexisten SweetAlert v1 y v2, alert() nativo y el silencio.",
 "Login (swal), Nueva Cuenta (GetDataCliente/VerificarRua), PagoOnline (getDataSectores), Mi Cuenta "
 "(Guardar sin respuesta), Rastreo (filtro).",
 "Un sistema de notificación único: toast/inline para éxito y avisos, bloque de error junto al "
 "contexto que falló, diálogo modal solo para confirmaciones, iconografía y tono coherentes, y "
 "manejo obligatorio del error de cada llamada asíncrona con texto útil en español. Nunca alert(), "
 "nunca un valor crudo del servicio escrito en un campo.",
 ["LG-03","LG-04","MC-05","NC-04","NC-14","PO-06","RA-03","RA-10"],
 "solo-transversal",
),
(
 "PAT-21", "Arquitectura de front-end",
 "Controles interactivos construidos con el elemento HTML equivocado",
 "Las acciones principales no son botones: 'Entrar' y 'Recuperar mi Contraseña?' son <a href='#'> "
 "que llaman a un submit oculto (el rol es enlace, Espacio no los activa y cada clic añade '#' a la "
 "URL), 'Buscar' del modal es otro <a href='#' onclick>, el disparador del menú de usuario es un <a> "
 "sin href que ni siquiera es enfocable —de modo que 'Salir' no se alcanza con teclado—, el toggle "
 "de grupo del grid es una <img> con onclick sin tabindex ni rol, el cierre del popup de Movimientos "
 "es un <div> y los iconos PDF de Estado son <div> con un input de 0×0 px dentro. El teclado y los "
 "lectores de pantalla quedan fuera en cada caso.",
 "Entrar y Recuperar (Login), Buscar del modal y toggles del grid (Rastreo), cierre de "
 "cpBody_ppCambioGuia, <a data-toggle=dropdown> del header, iconos PDF de Estado.",
 "Regla de sistema: toda acción es <button> (submit o type=button) y toda navegación es <a href> con "
 "destino real. El sistema de diseño provee Botón, BotónIcono y Enlace, y ningún control se construye "
 "con div/img/a-vacío. Corrige de una vez rol, teclado, foco y semántica en todas las pantallas.",
 ["EC-04","LG-07","LG-17","RA-04","RA-05","RA-13","SH-02"],
 "solo-transversal",
),
(
 "PAT-22", "Arquitectura de front-end",
 "Un único <form> global de WebForms con submits ocultos y sin botón por defecto",
 "Toda página autenticada es un solo form#frmBody sin defaultbutton, y el primer submit del "
 "documento es #SetCliente, un input oculto de la master page: pulsar Enter en cualquier campo de "
 "Mi Cuenta dispara ese handler oculto en lugar de Guardar. El patrón se repite en las demás "
 "pantallas: #blogin y #bRecuperar (Login), #bsendConfi (Nueva Cuenta), #cpBody_bFiltro (Rastreo), "
 "y varios submits ocultos más en Mi Cuenta (Agregar Dependiente/Direccion, Canjear Cupon). En "
 "PreAlerta, Enter en cualquier campo envía directamente la pre-alerta.",
 "form#frmBody de la master page; #SetCliente, #blogin, #bRecuperar, #bsendConfi, #cpBody_bFiltro, "
 "#cpBody_Button2/#cpBody_Button6/#cpBody_BVerificar.",
 "En el rediseño, un formulario por unidad de trabajo (o campos agrupados con submit explícito), "
 "con el botón principal como primer submit y Enter con comportamiento definido y probado. Ningún "
 "submit oculto: si una acción existe, se ve; si no está disponible, no se renderiza (ver PAT-27).",
 ["LG-07","LG-17","MC-07","NC-14","PA-03","SH-05"],
 "solo-transversal",
),
(
 "PAT-23", "Arquitectura de front-end",
 "El postback completo como único modelo de interacción: lento, sin feedback y con pérdida de estado",
 "Cada interacción recarga la página entera. El login tarda 17–18 s sin ningún indicador; la "
 "descarga de una factura son ~4 s de postback más una ventana auxiliar; la cascada de dirección "
 "hace un __doPostBack completo por cada select; cambiar de pestaña o pulsar un enlace del footer "
 "(href='') recarga y descarta lo que el usuario estaba escribiendo; y el sidebar colapsado vuelve a "
 "abrirse en cada navegación porque no hay nada que persista la preferencia entre cargas.",
 "Login.aspx (POST de acceso), Estado (descarga PDF), Mi Cuenta (cascada de dirección, pestañas), "
 ".app-footer a (enlaces con href vacío), .close-sidebar-btn.",
 "Reservar la recarga completa para los cambios de pantalla y resolver con actualización parcial "
 "todo lo demás (cascadas dependientes, filtros, cambios de pestaña, descargas). Mientras exista "
 "postback, ninguna acción puede perder datos escritos sin avisar, y las preferencias de interfaz se "
 "guardan en cliente.",
 ["EC-05","LG-08","MC-14","MC-17","SH-03","SH-06"],
 "solo-transversal",
),
(
 "PAT-24", "Navegación y estado",
 "El estado de la interfaz no se refleja en la URL ni se conserva",
 "La interfaz y la URL van por caminos distintos, en los dos sentidos. Lo que el usuario elige no se "
 "puede enlazar ni recuperar: la pestaña activa de Mi Cuenta no se restaura desde el hash ni "
 "sobrevive a F5, y el sidebar colapsado se reabre al navegar. Y lo que no eligió, persiste: el "
 "filtro del histórico de Rastreo se guarda en servidor y sigue aplicado tras Atrás, recargar o "
 "volver a entrar, sin que la pantalla muestre el rango ni ofrezca quitarlo. Encima, el indicador de "
 "página activa del sidebar es incorrecto en 3 de 6 pantallas (Estado sin ítem activo, Prueba "
 "marcando 'Rastreo', PagoOnline sin ninguno) y no usa aria-current.",
 "Pestañas #cpBody_ltab1/2/4 (Mi Cuenta), filtro del modal Historial (Rastreo), .close-sidebar-btn, "
 ".vertical-nav-menu (clase mm-active).",
 "Convención de estado: pestaña, filtro, orden y página viven en la URL (enlazables, compartibles y "
 "restaurables con F5 y con Atrás); las preferencias de chrome (sidebar) se guardan en cliente; y el "
 "ítem activo del sidebar se deriva de la ruta actual —no de un id por página— con aria-current='page'.",
 ["MC-17","RA-20","SH-04","SH-06"],
 "solo-transversal",
),
(
 "PAT-25", "Formularios y accesibilidad",
 "Controles bloqueados o vacíos sin ninguna explicación",
 "El portal presenta con frecuencia campos que parecen editables pero no lo son, y nunca dice por "
 "qué: Codigo (readonly), Sucursal, País y Provincia cargan deshabilitados en Mi Cuenta sin tooltip "
 "ni texto de ayuda; Ciudad y Sector están habilitados pero con 0 opciones (bloques rojos sin "
 "texto); el 'Codigo Cliente' de PreAlerta es un campo deshabilitado, marcado con asterisco, que ni "
 "siquiera viaja en el POST; en Nueva Cuenta, Contraseña, teléfonos y fecha están deshabilitados y "
 "obligatorios hasta que responde un web service, y si la llamada falla se quedan así sin aviso; y "
 "en PagoOnline el botón 'Pagar Con' está habilitado con un menú de formas de pago vacío. El caso "
 "extremo es que el formulario de direcciones no se puede completar en absoluto con esta cuenta.",
 "#cpBody_lCodigo, #cpBody_lSucursal, #cpBody_cbPais, #cpBody_cbProvincia, #cpBody_cbCiudad, "
 "#cpBody_cbSector (Mi Cuenta); #cpBody_ClienteID (PreAlerta); #Password/#ltelefono/#lcelular/"
 "#tbFecha (Nueva Cuenta); #cpBody_bpagar y #cpBody_ulFormaPagos (PagoOnline).",
 "Convención de estados no editables: un dato que el usuario no puede cambiar se muestra como dato "
 "(texto etiquetado), no como campo; si un control depende de otro, se deshabilita con texto de "
 "ayuda que diga de qué depende; y si una función no está disponible para la cuenta, se explica en "
 "lugar de dejar un control muerto. Todo estado bloqueado necesita motivo y, si aplica, vía de "
 "resolución.",
 ["MC-02","MC-13","MC-14","NC-03","NC-04","PA-02","PO-03"],
 "hint-fusionado",
),
(
 "PAT-26", "Formularios y accesibilidad",
 "Selectores dependientes en cascada rotos o vacíos",
 "El patrón país → provincia → ciudad → sector aparece en tres pantallas y en ninguna funciona "
 "completo: en Mi Cuenta los dos primeros niveles están deshabilitados, así que los dos siguientes "
 "nunca se rellenan (cada nivel depende de un postback completo del padre); en Nueva Cuenta el "
 "select de provincias existe oculto y con 0 opciones; y en el checkout de PagoOnline la carga de "
 "sectores usa $.ajax con async:false y alert('error') como manejo de errores.",
 "#cpBody_cbPais → #cpBody_cbProvincia → #cpBody_cbCiudad → #cpBody_cbSector (Mi Cuenta), cbPais/"
 "cbProvincias ocultos (Nueva Cuenta), getDataSectores (PagoOnline).",
 "Un componente SelectorDependiente único: carga asíncrona por nivel con estado de carga, "
 "deshabilitado explicado ('Selecciona una provincia primero'), reseteo de los hijos al cambiar el "
 "padre, manejo de error visible y ningún postback completo. Debe resolver a la vez el alta de "
 "dirección, el registro y la entrega a domicilio del pago.",
 ["MC-13","MC-14","NC-02","PO-06"],
 "solo-transversal",
),
(
 "PAT-27", "Arquitectura de front-end",
 "Funcionalidad no disponible ocultada solo con CSS",
 "Lo que la cuenta no puede usar sigue renderizado y operativo en el cliente: la pestaña 'Tarjetas "
 "Registradas' se revela quitando display:none al <li> y muestra el grid de tarjetas, 'Agregar "
 "Tarjeta' y el popup de borrado sin ninguna petición al servidor; el enlace 'Pagos Online' está "
 "oculto pero PagoOnline.aspx responde 200 con el listado y el botón de pago; hay submits ocultos "
 "reales (Agregar Dependiente, Agregar Direccion, Canjear Cupon); en Nueva Cuenta los campos que se "
 "ocultan al cambiar de tipo de cliente conservan su valor y su etiqueta anterior. Como efecto "
 "colateral, el sidebar no puede marcar como activa una pantalla cuyo ítem está oculto.",
 "#cpBody_ltab3 y #cpBody_gvTarjetas (Mi Cuenta), li 'Pagos Online' → PagoOnline.aspx, "
 "#cpBody_Button2/#cpBody_Button6/#cpBody_BVerificar, secciones de #ddTipo (Nueva Cuenta).",
 "La disponibilidad se decide en servidor: lo que la cuenta no puede usar no se renderiza y su ruta "
 "está protegida. En cliente, mostrar/ocultar secciones debe además limpiar su estado (valores, "
 "etiquetas, validación) para que no viaje información de una variante a otra.",
 ["NC-11","PO-03","SH-04","SH-05"],
 "hint-confirmado",
),
(
 "PAT-28", "Arquitectura de front-end",
 "Código de cliente muerto, duplicado o roto embebido en las páginas",
 "Las páginas arrastran JavaScript inline que no hace lo que aparenta: Confirmar()/SweetAlert existe "
 "en Login, Mi Cuenta, Nueva Cuenta y PreAlerta pero no está enlazado a ningún botón, y donde se "
 "usaría está escrito contra la API de SweetAlert v1 sobre SweetAlert2 9.17.2, de modo que el "
 "diálogo solo muestra 'OK' y nunca llega a llamar a Guardar() —si el servidor invoca Confirmar() "
 "tras el primer envío, el registro no puede completarse—; valida_cedula() implementa el dígito "
 "verificador pero no está enlazada a ningún evento; dos handlers de carga compiten por el valor de "
 "'Referido'; para tipo Personal se disparan a la vez GetNombreCedula y GetNombreRNC contra el mismo "
 "campo; hay un addEventListener('select') sobre un <select> (evento inexistente) escribiendo en un "
 "#log que no existe; y en el checkout GetLocation()() invoca el resultado undefined de una función.",
 "Scripts inline de Login.aspx, MiCuenta.aspx, NuevaCuenta.aspx, PreAlerta.aspx y PagoOnline.aspx.",
 "El rediseño parte de cero en la capa de cliente: nada de JS inline por página, una sola librería "
 "de diálogos con una versión fijada, y las utilidades reales (validación de cédula, confirmación, "
 "manejo de errores) como módulos compartidos con pruebas. Antes de migrar, inventariar qué código "
 "está vivo: buena parte de lo que hay hoy no se ejecuta nunca.",
 ["MC-05","NC-04","NC-10","NC-11","NC-12","NC-14","PA-03","PO-06"],
 "solo-transversal",
),
(
 "PAT-29", "Infraestructura y recursos",
 "Recursos de terceros y contenido mixto en producción",
 "Piezas visibles del portal dependen de dominios ajenos y de http://: Login carga jQuery 1.7.1 "
 "desde http://ajax.googleapis.com, que el navegador bloquea en cada carga (y el evento load de la "
 "ventana no llega a dispararse) antes de cargar otra copia local; el banner del registro se sirve "
 "desde i.postimg.cc; la imagen de tarjetas del footer desde tainoexpress.com; el clip de la columna "
 "AD desde http://sys.translogic.com.do; y el avatar del menú de usuario desde un proxy de "
 "googleusercontent que no carga (naturalWidth 0), dejando el disparador reducido a un caret de "
 "22×21 px.",
 "Login.aspx (jQuery http), NuevaCuenta.aspx (banner postimg), .app-footer (tainoexpress), grid de "
 "Rastreo (Clip.png), header del chrome compartido (avatar).",
 "Todos los assets del rediseño se sirven desde el propio dominio y por https, con una sola copia de "
 "cada librería y versión fijada; los avatares y logotipos tienen fallback local. Ningún elemento de "
 "la interfaz puede depender de que un tercero esté disponible.",
 ["LG-18","NC-18","RA-07","SH-02","SH-03"],
 "solo-transversal",
),
(
 "PAT-30", "Infraestructura y recursos",
 "Datos internos expuestos en el cliente",
 "El HTML entregado al navegador contiene información que no debería salir del servidor: un campo "
 "oculto #cpBody_TokenID con un valor fijo con aspecto de prueba ('GB123456789.101112131415') que se "
 "envía a WebService1.asmx desde PagoOnline, PreAlerta y Prueba de Exportación; el desplegable "
 "'Referido' de Nueva Cuenta con 55 opciones que mezclan canales con nombres propios de personas y "
 "campañas internas; y las funciones ocultas de Mi Cuenta (tarjetas, cupón) con sus controles y "
 "popups completos en el DOM.",
 "#cpBody_TokenID (PagoOnline, PreAlerta, Prueba de Exportación), #cbMedioiD (Nueva Cuenta), "
 "#cpBody_lefticontab3 y #cpBody_BVerificar (Mi Cuenta).",
 "Regla del rediseño: ningún token, credencial ni catálogo interno viaja en el HTML; los catálogos "
 "de cara al cliente se curan (canales de referido, sin datos personales) y la autorización de cada "
 "llamada se resuelve con la sesión, no con un identificador incrustado en la página.",
 ["NC-12","PO-06","SH-05"],
 "solo-transversal",
),
(
 "PAT-31", "Idioma y contenido",
 "Localización incompleta: lang='en' y textos del framework y del navegador en inglés",
 "El portal es en español pero no está declarado ni configurado como tal: <html lang='en'> en las "
 "pantallas autenticadas y sin atributo lang en Login y Nueva Cuenta (axe html-has-lang), los grids "
 "DevExpress escriben 'No data to display' y 'Loading…', la validación nativa muestra 'Please fill "
 "out this field.' / 'Please select a file.' porque la aplicación no define mensajes propios, las "
 "páginas de error del servidor son las de ASP.NET en inglés, y en Rastreo las fechas se muestran en "
 "formato estadounidense ('9/2/2026 4:43:55 PM'). El idioma real de la interfaz depende del "
 "navegador del usuario.",
 "Todas las pantallas (atributo lang), grids DevExpress de las 8 pantallas con listado, mensajes de "
 "validación nativa de Login/Nueva Cuenta/PreAlerta, páginas de error 500.",
 "Tratar el idioma como configuración de plataforma: lang='es' (es-DO) en la plantilla, cultura del "
 "servidor y del framework de grids localizada, mensajes de validación y de error propios en "
 "español, y ningún texto visible generado por una librería sin traducir. Sin esto, cada componente "
 "nuevo volverá a introducir inglés.",
 ["EC-07","LG-11","LG-12","MC-09","MC-11","MC-19","NC-03","NC-15","NC-17","PA-03","PA-10","PA-12","RA-11"],
 "hint-fusionado",
),
(
 "PAT-32", "Idioma y contenido",
 "Copy en español descuidado: tildes ausentes, concordancia y nombres internos de campo como rótulos",
 "La redacción no ha pasado por edición en ninguna pantalla: faltan tildes de forma sistemática "
 "(Codigo, Identificacion, Contrasena, Direccion, Telefono, Guia, Categoria, Linea, Envia) "
 "conviviendo con textos sí acentuados; hay errores de concordancia ('Actualiza tu Datos.', "
 "'Consulta el estatus de tu Paquetes.', 'Pagas tu Paquetes'), erratas ('Proovedor', 'Personal "
 "Detalles'), signos de interrogación sin apertura, mezcla de tuteo y usted, y nombres internos de "
 "campo expuestos como cabecera o placeholder ('TotalFacturado', 'Envianombre', 'tbFecha', 'AD', "
 "'Prueba Exportacion'). En Rastreo llega a renderizarse un 'gv' suelto entre dos campos del modal.",
 "Etiquetas, cabeceras de grid, subtítulos, placeholders y textos de botón de las 9 pantallas; "
 "cabeceras de #cpBody_gvDatos en Estado, PagoOnline, PreAlerta y Rastreo.",
 "El rediseño necesita una guía de contenido: tono (tuteo o usted, elegido y aplicado), reglas de "
 "capitalización y acentuación, y un glosario de términos de negocio que sustituya los nombres de "
 "campo por nombres de usuario (Envianombre → Remitente, AD → Adjuntos, TotalFacturado → Total "
 "facturado). Los textos se definen con el diseño, no se heredan del modelo de datos.",
 ["EC-06","LG-12","MC-09","NC-12","NC-15","PA-12","PO-02","PO-05","RA-01","RA-11"],
 "hint-fusionado",
),
(
 "PAT-33", "Idioma y contenido",
 "Formatos de fecha, número y moneda inconsistentes entre pantallas",
 "El mismo dato se presenta de tres formas distintas según la pantalla: Estado muestra las fechas "
 "como 'MM-DD-YYYY', Prueba de Exportación y PagoOnline como 'M/D/YYYY', el PDF de la factura como "
 "'DD/MM/YYYY' y el popup de movimientos como '9/2/2026 4:43:55 PM'. Los importes tampoco tienen "
 "regla: el total de PagoOnline se muestra como 'DOP$: 0.000' (tres decimales, sin decir qué "
 "totaliza), el footer de Estado sin etiqueta ni moneda, el campo de valor declarado admite seis "
 "decimales y notación científica, y 'Dias Vencidos' muestra números negativos (-5, -1) para "
 "facturas que aún no han vencido sin explicar el signo.",
 "Columnas de fecha e importe de #cpBody_gvDatos (Estado, Prueba, PagoOnline), popup de Movimientos "
 "(Rastreo), #cpBody_FOB (PreAlerta), placeholder de máscara de #cpBody_lCelularDependiente.",
 "Fijar formatos de presentación en el sistema (fecha corta dd/MM/yyyy, fecha con hora, moneda "
 "RD$/US$ con dos decimales y separador de miles) y aplicarlos con utilidades compartidas, tanto en "
 "pantalla como en los PDF. Los conceptos con signo se explican con lenguaje ('Vence en 5 días'), no "
 "con un número negativo.",
 ["EC-06","MC-10","PA-06","PO-02","RA-11"],
 "solo-transversal",
),
(
 "PAT-34", "Idioma y contenido",
 "Marca y elementos institucionales sin mantenimiento",
 "Las piezas que representan a la empresa están descuidadas en las pantallas públicas y en el pie de "
 "todas las demás: el logotipo del login enlaza a index.html, que devuelve 404, y desaparece por "
 "completo a 375 px dejando un hueco; el título de la pestaña del login es 'Domipack - Web Trans' "
 "(nombre interno); el logo del registro lleva alt='Girl in a jacket' (texto de tutorial) y bajo el "
 "formulario se estira una imagen de 1024×500 px a 319×1135 px; y el footer de todo el portal dice "
 "'2022 - DOMIPACK, TODOS LOS DERECHOS RESERVADOS' con tres enlaces legales cuyo href está vacío y "
 "que recargan la página actual.",
 "a.logo e #imaglogo y <title> (Login), logo y banner inferior (Nueva Cuenta), .app-footer (todas "
 "las pantallas autenticadas y Login).",
 "Definir el kit de marca del portal (logotipo responsive con versión compacta, títulos de pestaña "
 "por pantalla orientados al cliente, alt descriptivos, imágenes con proporción fija) y el pie "
 "institucional real: año dinámico y enlaces a los documentos legales existentes, o retirarlos. Es "
 "la primera impresión del producto y hoy es la parte más deteriorada.",
 ["LG-09","LG-12","LG-14","NC-15","NC-18","SH-03"],
 "solo-transversal",
),
(
 "PAT-35", "Sesión y acceso",
 "Ciclo de vida de la sesión mal definido y cierre de sesión implícito",
 "No hay un modelo de sesión: visitar Login.aspx con la sesión activa —por URL, por un marcador o "
 "por el propio enlace 'Salir'— la invalida y devuelve el formulario, sin ningún manejo de 'ya has "
 "iniciado sesión'; de hecho 'Salir' es un onclick que navega a /Login.aspx, es decir, el cierre de "
 "sesión es un efecto colateral de esa navegación y además no es alcanzable con teclado (su menú "
 "cuelga de un <a> no enfocable); y mientras el resto de rutas protegidas redirigen correctamente "
 "con 302, dlg/Adjuntos.aspx responde 500 sin sesión.",
 "Login.aspx con sesión activa, botón 'Salir' del menú de usuario, rutas protegidas y "
 "dlg/Adjuntos.aspx.",
 "Definir el contrato de sesión del rediseño: cierre de sesión explícito (acción POST que invalida "
 "en servidor y confirma), Login con sesión activa que redirige al inicio, redirección uniforme de "
 "toda ruta protegida con retorno a la página pedida, y aviso de expiración. El acceso a la cuenta "
 "debe ser operable con teclado.",
 ["LG-13","LG-16","SH-02"],
 "solo-transversal",
),
(
 "PAT-36", "Sistema visual",
 "No hay sistema de diseño: dos plantillas, dos temas de grid y clases aplicadas fuera de su uso",
 "La incoherencia visual es estructural, no estética: las pantallas públicas (Login, Nueva Cuenta) y "
 "las autenticadas usan plantillas distintas con estilos de foco, viewport y tipografía distintos; "
 "los grids conviven con dos temas DevExpress (Office365 en casi todo, Moderno en PagoOnline, que es "
 "donde las cabeceras resultan ilegibles); el modo adaptativo del grid está activo en unas pantallas "
 "y no en otras; los selects de dirección se pintan como cajas rojas sólidas; y la clase "
 ".form-control se aplica a checkboxes, que pasan a medir 300×38 px, mientras otras casillas quedan "
 "en 13×13 px dentro de un contenedor de ancho completo.",
 "Plantilla pública vs master page autenticada; temas dxgvControl_Office365 / _Moderno; "
 "#cpBody_cbPais…#cpBody_cbSector; #cpBody_ckPrincipal, #ckDomicilio, #ckRua.",
 "El entregable central del rediseño es un sistema de diseño único: tokens (color, tipografía, "
 "espaciado, foco, radio, área táctil), componentes (campo, botón, tabla, diálogo, estado vacío, "
 "notificación) y una sola plantilla de página para zona pública y privada. Sin él, cada pantalla "
 "seguirá resolviendo lo mismo de forma distinta.",
 ["EC-03","MC-13","MC-15","MC-16","NC-16","PO-04"],
 "solo-transversal",
),
(
 "PAT-37", "Tablas y listados",
 "Listados sin filtro, búsqueda ni paginación: no escalan más allá de la cuenta de prueba",
 "Los listados se sirven completos y sin herramientas: Estado ('Consulta Estados de Cuenta') y "
 "Prueba de Exportación no tienen fila de filtro, panel de búsqueda ni pager (DXFilterRow=0, "
 "DXPager=0); solo Rastreo tiene filtro y está escondido en un modal, sin mostrar el rango aplicado "
 "ni ofrecer quitarlo, y sin distinguir 'sin resultados' de 'sin datos'. Con 3–4 filas de la cuenta "
 "de prueba no molesta, pero una cuenta con historial real deja una tabla única imposible de acotar.",
 "#cpBody_gvDatos de Estado.aspx y PruebaExportacion.aspx, modal Historial Guías y grid principal de "
 "Rastreo.",
 "Un patrón único de listado para el rediseño: barra de filtros visible sobre la tabla (periodo, "
 "estado, búsqueda), resumen del filtro aplicado con acción de limpiar, orden por columna y "
 "paginación o carga incremental, con los parámetros en la URL (ver PAT-14/PAT-24). Debe validarse "
 "con una cuenta de alto volumen, que esta auditoría no tuvo.",
 ["EC-01","RA-10","RA-20"],
 "hint-confirmado",
),
(
 "PAT-38", "Feedback de acciones",
 "Entrega de documentos generados poco cuidada",
 "Las dos pantallas que generan PDF lo hacen de forma distinta y ninguna acompaña al usuario: en "
 "Estado, la factura llega tras ~4 s de postback abriendo una ventana auxiliar y con nombre de "
 "archivo GUID ('a7f01673-….pdf', servido además desde una URL con doble barra), mientras que en "
 "Prueba de Exportación el mismo tipo de acción devuelve el PDF como adjunto del POST y con nombre "
 "por tracking ('TBA333722866266.pdf'); en ambos casos el disparador es un icono sin nombre "
 "accesible.",
 "Iconos PDF por fila de #cpBody_gvDatos (Estado), a.dxgv__cci Imprimir (Prueba de Exportación).",
 "Un patrón único de descarga: nombre de archivo descriptivo y estable "
 "(Factura-FT33-006983.pdf, Guia-TBA333722866266.pdf), sin ventana intermedia, con estado de "
 "progreso en el propio botón y confirmación o error visible al terminar.",
 ["EC-05","PE-03"],
 "solo-transversal",
),
(
 "PAT-39", "Formularios y accesibilidad",
 "Valores por defecto que el usuario no eligió se envían como si los hubiera elegido",
 "Varias pantallas preseleccionan por el usuario y no lo distinguen de una elección real: el select "
 "de transportista de PreAlerta carga con 'UPS' y satisface el required sin que nadie lo toque, así "
 "que una pre-alerta de Amazon puede registrarse como UPS; en Nueva Cuenta 'Oficina' viene fijada en "
 "'OFICINA PRINCIPAL NACO', 'Sexo' puede enviarse con el placeholder 'Seleccionar' (value 'S') y "
 "'Referido' arranca vacío; y en PagoOnline la única fila del listado aparece ya seleccionada desde "
 "el servidor —lo que deja el botón de pago habilitado— sin que el usuario pueda seleccionarla o "
 "deseleccionarla con un clic.",
 "#cpBody_Transpos (PreAlerta), #sSexo/#cbMedioiD/#lSucursal (Nueva Cuenta), fila preseleccionada de "
 "#cpBody_gvDatos (PagoOnline).",
 "Convención para elecciones con consecuencias: opción vacía 'Selecciona…' que no satisface el "
 "required, o valor por defecto explicado y visible como decisión del sistema. La selección de filas "
 "en un listado es siempre del usuario, con control visible (checkbox) y estado reflejado en la "
 "acción.",
 ["NC-10","PA-08","PO-02"],
 "solo-transversal",
),
(
 "PAT-40", "Formularios y accesibilidad",
 "El marcado de obligatoriedad no se corresponde con el comportamiento",
 "Los asteriscos y el required van cada uno por su lado: en Nueva Cuenta 'Cedula: *' no tiene "
 "required mientras 'Password:' lo es sin llevar asterisco, y varios campos required están "
 "deshabilitados (el navegador ni los valida ni los envía); en PreAlerta los asteriscos son texto "
 "suelto sin leyenda de qué significan, el 'Codigo Cliente' deshabilitado luce asterisco aunque no "
 "viaje en el POST, y la factura es obligatoria aunque un cliente pueda no tenerla.",
 "#Identificacion/#Password/#lcelular (Nueva Cuenta), rótulos con '*' y #cpBody_ClienteID y "
 "#cpBody_File1 (PreAlerta).",
 "Un único indicador de obligatoriedad en el sistema de diseño (marca visual + aria-required + "
 "leyenda '* campo obligatorio'), generado desde la misma definición de campo que la validación, de "
 "modo que marca y comportamiento no puedan divergir. Revisar además qué es realmente obligatorio en "
 "cada flujo.",
 ["NC-03","PA-01","PA-02","PA-09"],
 "solo-transversal",
),
(
 "PAT-41", "Formularios y accesibilidad",
 "Controles decorativos que no producen ningún efecto",
 "El portal muestra controles con los que se puede interactuar y que no hacen nada: 'Remember me' "
 "viene marcada por defecto pero no tiene atributo name, así que nunca viaja en el POST y la sesión "
 "es de sesión en ambos casos; 'Codigo Cliente' de PreAlerta es un campo deshabilitado cuyo valor "
 "tampoco se envía (el servidor lo toma de la sesión); 'Rua Registrado' la fija un web service pero "
 "el usuario puede marcarla y desmarcarla sin consecuencia ni explicación; y 'Pagar Con' abre un "
 "menú de formas de pago vacío.",
 "#checkbox-signup (Login), #cpBody_ClienteID (PreAlerta), #ckRua (Nueva Cuenta), #cpBody_bpagar y "
 "#cpBody_ulFormaPagos (PagoOnline).",
 "Regla de producto: si un control no cambia nada, se retira; si el sistema decide el valor, se "
 "muestra como dato de solo lectura con su explicación; y si la función no está disponible, se dice "
 "en lugar de dejar el control activo. Cada control interactivo del rediseño debe poder responder "
 "qué cambia al usarlo.",
 ["LG-06","NC-02","PA-02","PO-03"],
 "solo-transversal",
),
]


def main():
    findings = json.loads(FINDINGS.read_text(encoding="utf-8"))
    by_id = {f["id"]: f for f in findings}

    # Validación de integridad de las referencias
    unknown = sorted({fid for p in P for fid in p[6] if fid not in by_id})
    if unknown:
        raise SystemExit(f"ids de hallazgo inexistentes: {unknown}")
    dup = [p[0] for p in P if len(p[6]) != len(set(p[6]))]
    if dup:
        raise SystemExit(f"patrones con ids repetidos: {dup}")

    hints = {f["id"]: f["patron_sugerido_fase7"] for f in findings if f.get("patron_sugerido_fase7")}

    patterns = []
    for pid, familia, nombre, desc, comps, impl, hids, origen in P:
        sev = [by_id[h]["severidad"] for h in hids]
        cats = sorted({by_id[h]["categoria"] for h in hids})
        pantallas = sorted({PANTALLAS[h.split("-")[0]] for h in hids})
        severidad_max = ("critico" if "critico" in sev else "mayor" if "mayor" in sev else "menor")
        patterns.append({
            "id": pid,
            "familia": familia,
            "nombre": nombre,
            "descripcion": desc,
            "hallazgos_relacionados": hids,
            "n_hallazgos": len(hids),
            "severidad_max": severidad_max,
            "conteo_severidad": {s: sev.count(s) for s in ("critico", "mayor", "menor") if sev.count(s)},
            "categorias": cats,
            "alcance": {"pantallas": pantallas, "componentes": comps},
            "implicacion_diseno": impl,
            "origen": origen,
        })

    # patron_relacionado en cada hallazgo (lista de ids de patrón)
    rel = collections.defaultdict(list)
    for p in patterns:
        for h in p["hallazgos_relacionados"]:
            rel[h].append(p["id"])
    for f in findings:
        f["patron_relacionado"] = rel.get(f["id"], [])
        f.pop("patron_sugerido_fase7", None)

    vinculados = [f["id"] for f in findings if f["patron_relacionado"]]
    sueltos = [f["id"] for f in findings if not f["patron_relacionado"]]

    doc = {
        "fase": 7,
        "generado": datetime.date.today().isoformat(),
        "fuente": "audit/findings/findings.json (105 hallazgos, Fase 4)",
        "notas": {
            "patron_relacionado": "En findings.json es una lista de ids de patrón: un hallazgo puede "
                                  "ser manifestación de varias causas raíz (p. ej. un icono sin nombre "
                                  "accesible que además no muestra foco).",
            "patron_sugerido_fase7": "Retirado de findings.json para no duplicar información; los "
                                     "hints originales de los workers de Fase 4 se conservan aquí en "
                                     "trazabilidad_hints_fase4. Algunos hints siguen apareciendo "
                                     "incrustados en el texto de info_tecnica de ciertos hallazgos: "
                                     "se dejan intactos por ser parte de la nota técnica original.",
            "origen": "hint-confirmado = sugerido por un worker y verificado en el dataset completo; "
                      "hint-fusionado = varios hints describían la misma causa raíz; "
                      "solo-transversal = no era visible desde un único grupo de pantallas.",
        },
        "resumen": {
            "patrones": len(patterns),
            "hallazgos_totales": len(findings),
            "hallazgos_vinculados": len(vinculados),
            "hallazgos_sin_patron": len(sueltos),
            "ids_sin_patron": sueltos,
            "por_familia": dict(collections.Counter(p["familia"] for p in patterns)),
            "por_origen": dict(collections.Counter(p["origen"] for p in patterns)),
        },
        "patrones": patterns,
        "trazabilidad_hints_fase4": {
            h: {"hint": t, "patrones_asignados": rel.get(h, [])} for h, t in sorted(hints.items())
        },
    }

    PATTERNS.parent.mkdir(parents=True, exist_ok=True)
    PATTERNS.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    FINDINGS.write_text(json.dumps(findings, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"patrones: {len(patterns)}")
    print(f"vinculados: {len(vinculados)} / sin patrón: {len(sueltos)} -> {sueltos}")
    cnt = collections.Counter(len(f["patron_relacionado"]) for f in findings)
    print("patrones por hallazgo:", dict(sorted(cnt.items())))
    print("cobertura por severidad:",
          {s: f"{sum(1 for f in findings if f['severidad'] == s and f['patron_relacionado'])}/"
              f"{sum(1 for f in findings if f['severidad'] == s)}"
           for s in ("critico", "mayor", "menor")})


if __name__ == "__main__":
    main()
