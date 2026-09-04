# Cobertura de la auditoría (Fase 8)

Cifras extraídas de `audit/reports/execution-log.md` (consolidado Fase 4,
refrescado 2026-09-04T03:21:49.792Z) y de los inventarios de Fase 1–3
(`audit/inventory/`, `audit/matrix/test-matrix.md`). Cuenta de prueba única:
`DP-014003`.

## 1. Pantallas

| Métrica | Cifra | Fuente |
|---|---|---|
| Pantallas de nivel superior descubiertas | 8 (Login, Nueva Cuenta, Mi Cuenta, Estados de Cuenta, Rastreo, Prueba de Exportación, PreAlerta, Pagos Online) | `inventory/sitemap.md` §Top-level screens |
| Sub-vistas / modales / diálogos descubiertos | 9 (3 pestañas de Mi Cuenta + 1 pestaña oculta "Tarjetas Registradas"; 2 modales de Rastreo + 1 diálogo Adjuntos + 1 expansor de fila (no es pantalla) + 1 dropdown "Pagar Con" en PagoOnline) | `inventory/sitemap.md` §Sub-views/modals |
| **Total de objetivos de navegación descubiertos** | **17** | suma de las dos filas anteriores |
| Pantallas/sub-vistas auditadas (≥1 caso ejecutado) | 18 de 18 filas de cobertura (100%) — el expansor de fila y el dropdown "Pagar Con" no tienen fila propia porque sus casos se pliegan dentro de "Rastreo (grid)" y "PagoOnline" respectivamente | `execution-log.md` tabla de cobertura consolidada |

El execution-log divide el trabajo en 18 filas (grupo/pantalla) en lugar de
17, porque separa "Chrome compartido" como fila transversal propia y divide
Rastreo en 4 sub-conjuntos operativos (grid, navegación, menú, Movimientos)
para el reparto del trabajo entre agentes — no porque haya pantallas
adicionales sin descubrir.

## 2. Componentes

| Métrica | Cifra | Fuente |
|---|---|---|
| Ficheros de inventario de componentes | 9 (`_shared-chrome.json` + 8 pantallas) | `inventory/components/index.md` |
| Instancias de componente catalogadas | **96** (8 chrome compartido + 7 Login + 15 Nueva Cuenta + 30 Mi Cuenta + 3 Estado de Cuenta + 17 Rastreo + 3 Prueba de Exportación + 10 PreAlerta + 3 PagoOnline) | recuento directo de `components[]` + `subViews[].components[]` en cada JSON |

## 3. Casos de prueba

| Métrica | Cifra |
|---|---|
| Casos de la matriz (Fase 3, por tipo de componente) | ver `matrix/test-matrix.md` §13 (mapa de aplicabilidad por instancia) |
| **Casos aplicables (matriz × inventario de instancias)** | **579** |
| **Ejecutados** (pasa + falla + estático-ejecutado) | **538** (92.9% de los aplicables) |
| — Pasados | 110 |
| — Fallados (= hallazgos abiertos en `findings.json`) | 213 casos → **105 hallazgos** (un hallazgo puede agrupar varios casos fallados de la misma causa) |
| — Ejecutados en modo estático (inspección de código/DOM sin disparar el submit real, casos `[STATIC-ONLY]` de la matriz) | 215 |
| **Omitidos** | **41** (7.1% de los aplicables) |

Nota de trazabilidad: "Ejecutado" incluye los casos estático-únicamente
(`[STATIC-ONLY]`) porque sí produjeron una observación registrada (código
inspeccionado, comportamiento de cliente verificado) aunque el submit real
nunca se disparó, por la regla de oro de no ejecutar acciones irreversibles
sobre datos reales.

### 3.1 Cobertura por pantalla/grupo

| Pantalla (grupo / pantalla) | Aplicables | Ejecutados | Pasados | Fallados (casos → hallazgos) | Estático-ejecutado | Omitidos |
|---|---|---|---|---|---|---|
| docs / Estado de Cuenta | 29 | 24 | 8 | 13 (7) | 3 | 5 |
| docs / PagoOnline | 20 | 17 | 7 | 6 (9) | 4 | 3 |
| docs / PreAlerta | 64 | 61 | 17 | 15 (14) | 29 | 3 |
| docs / Prueba de Exportación | 29 | 24 | 11 | 9 (6) | 4 | 5 |
| login / Login | 56 | 51 | 18 | 26 (17) | 7 | 5 |
| login / Nueva Cuenta | 78 | 74 | 12 | 43 (18) | 19 | 4 |
| micuenta / Mi Cuenta > Datos Personales | 110 | 106 | 5 | 19 (13) | 82 | 4 |
| micuenta / Mi Cuenta > Dependientes | 65 | 62 | 2 | 15 (12) | 45 | 3 |
| micuenta / Mi Cuenta > Direccion | 30 | 27 | 0 | 17 (13) | 10 | 3 |
| micuenta / Mi Cuenta > Tarjetas Registradas (oculta) | 1 | 1 | 0 | 0 (1) | 1 | 0 |
| micuenta / Chrome compartido | 27 | 27 | 8 | 18 (6) | 1 | 0 |
| rastreo / Rastreo (grid #cpBody_gvDatos) | 9 | 8 | 1 | 6 (5) | 1 | 1 |
| rastreo / Rastreo (navegación) | 7 | 4 | 4 | 0 (0) | 0 | 3 |
| rastreo / Adjuntos (dlg/Adjuntos.aspx) | 7 | 6 | 1 | 3 (3) | 2 | 1 |
| rastreo / Historial Guías (modal) | 24 | 24 | 4 | 16 (8) | 4 | 0 |
| rastreo / Menú desplegable (#cpBody_bpagar) | 2 | 2 | 2 | 0 (0) | 0 | 0 |
| rastreo / Movimientos del Paquete (modal VerGuia) | 8 | 8 | 5 | 1 (1) | 2 | 0 |
| rastreo / Rastreo | 13 | 12 | 5 | 6 (6) | 1 | 1 |
| **Total** | **579** | **538** | **110** | **213 (105)** | **215** | **41** |

## 4. Hallazgos por severidad y categoría

Severidad: **2 críticos**, **40 mayores**, **63 menores** (105 total).

Categoría: accesibilidad 27 · validación 15 · ux-ui 20 · copy-contenido 14 ·
robustez 11 · funcional 8 · responsive 6 · servidor 4.

21 de los 105 hallazgos (20%) están marcados `impacto_a_confirmar`: su
severidad y alcance completo no se pudieron verificar del todo con la cuenta
de prueba (histórico corto, cascada de dirección bloqueada, función de pago
oculta) o porque el control asociado es `[STATIC-ONLY]` por la regla de oro
(no se envían formularios que crean datos reales o inician un pago). Van
incluidos en `findings.json` como hallazgos normales, con su nota de
confirmación pendiente — ver el detalle en `resumen-ejecutivo.md`.

## 5. Casos omitidos — desglose por motivo (41 de 579)

| Motivo | Casos | Ejemplos |
|---|---|---|
| **Limitación de la cuenta/entorno de prueba** — dataset pequeño (3–4 filas, sin estado vacío ni volumen alto observable), campos deshabilitados por la cuenta, cascada de dirección bloqueada | 9 | TB-01, TB-03 (Estado y Prueba de Exportación), SL-05 (Sucursal), DS-03/04/05 (cascada País→Provincia→Ciudad) |
| **Propiedad cruzada de grupo / riesgo de sesión** — el caso pertenece a otro grupo paralelo (chrome compartido, Salir, Login.aspx) y ejecutarlo desde este contexto invalidaría la sesión, o el caso ya se cubre en otro grupo | 12 | NV-10 y BT-08 (×5 cada uno, uno por pantalla `docs`/`rastreo`), RS-05, NV-06 |
| **No aplica a esta pantalla** — el control/campo que el caso requiere no existe aquí (sin textarea, sin campo deshabilitado al cargar, sin controles solo-icono, formato de campo no coincide, footer no se renderiza) | 20 | AX-02/AX-03 (gap-checks del coordinador en 6 pantallas), TF-08, TF-11, TF-12, CC-04, EM-07, PH-03, BT-06 |

Ningún caso se omitió por falta de tiempo o de alcance: las tres categorías
anteriores son limitaciones estructurales (cuenta única, reparto en paralelo,
o el caso simplemente no aplica a esa pantalla).
