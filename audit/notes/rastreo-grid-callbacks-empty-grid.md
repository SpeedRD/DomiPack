# Any DevExpress callback on the Rastreo grid (sort, group collapse) returns "No data to display" — reload restores it

Observed 2026-09-03 (`audit/scripts/phase4/rastreo-grid.ts`, evidence
`audit/logs/evidence/rastreo-TB-12-sort.json`, `rastreo-TB-05-groups.json`): clicking any
column header of `#cpBody_gvDatos` (sort) or the group-row collapse icon
(`ASPx.GVCollapseRow`) fires one DevExpress callback (`__CALLBACKID=ctl00$cpBody$gvDatos`,
`__CALLBACKPARAM=c0:KV|…;GB|20;4|SORT2|…` / collapse) which returns HTTP 200 (~12 KB) but a
grid with 0 data rows and 0 group rows. The grid keeps rendering the DevExpress default
empty state. A second click on the same header does not bring data back. A GET of
`Rastreo.aspx` (reload) shows the original rows again, and a new tab is unaffected, so the
state is NOT sticky server-side — the callback simply does not re-bind the data source
(classic Web Forms "DataBind only on !IsPostBack" pattern).

Practical consequences for anyone testing this app:
- Do the sort/collapse cases LAST in a script, or `go(page,'Rastreo.aspx')` right after.
- The adaptive "…" row-detail button (`a.dxgvADSB`) is client-side only (0 callbacks) and
  is safe.
- The Historial `Buscar` (full postback) and `VerGuia` (full postback) do keep data —
  only *callbacks* lose it.
- The Historial filter result is server-side sticky for the session: after a
  `Buscar`, later GETs of `Rastreo.aspx` (Back, reload, new navigation) keep showing the
  filtered set (10 rows) instead of the default 1-row view; there is no reset control.
