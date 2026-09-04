# `ASPx.AddDisabledItems(...)` in DevExpress markup does not mean the button is disabled

Phase 1/2 recorded the Prueba de Exportación `Imprimir` icons as "DISABLED (sprite class
…disabled)" because the HTML contains
`ASPx.AddDisabledItems('cpBody_gvDatos_DXCBtn0',[[['dxbDisabled_Office365'],…,[{'spriteCssClass':'dxIcon_print_printviapdf_32x32_disabled'}]]])`.
That call only *registers the styles to apply if the item becomes disabled*. At runtime
(`audit/logs/evidence/prueba-grid-snapshot.json`) every print anchor has no
`dxbDisabled` class, `cursor:pointer`, `opacity:1`, sprite `dxIcon_print_printviapdf_32x32`,
and a real click on all 4 rows produced a valid PDF (`audit/logs/evidence/prueba-row{0..3}.pdf`,
159 KB each, named `<tracking>.pdf`, returned as the attachment of the postback itself).

Lesson: check `className` / computed style at runtime (or click) before calling a
DevExpress command button disabled; the inline `AddDisabledItems` / `AddHoverItems` /
`AddPressedItems` scripts are style registrations, not state.

Related: the accessible name of those icons is the `alt` of the sprite image, which
DevExpress fills with the CustomButton **ID** (`alt="Clone"`, `title="Imprimir"`) — PE-03.
