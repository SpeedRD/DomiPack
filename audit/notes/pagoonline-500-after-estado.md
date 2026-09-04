# PagoOnline.aspx answers HTTP 500 for the rest of the session once Estado.aspx (or MiCuenta.aspx) has been visited

Observed 2026-09-03/04 (`audit/scripts/phase4/docs-pagoonline.ts`, evidence
`audit/logs/evidence/PO-01-attempts.json`). Same authenticated session, GET
PagoOnline.aspx after each step:

```
login (lands on Rastreo) -> Pago 200
2nd consecutive GET       -> 200
after Rastreo.aspx        -> 200
after PruebaExportacion   -> 200
after PreAlerta.aspx      -> 200
after Estado.aspx         -> 500 Runtime Error   <-- trigger
after MiCuenta.aspx       -> 500
consecutive GET           -> 500
after 10 s idle           -> 500
```

The recon session (Rastreo→Estado→Prueba→PreAlerta→Pago) also got 500 on its first
PagoOnline hit. The error page is the default ASP.NET "Server Error in '/' Application
— Runtime Error" (customErrors RemoteOnly, no detail).

Practical rules for anyone else touching PagoOnline:
- Capture PagoOnline **first** in a fresh session, before Estado/MiCuenta.
- The sidebar link is `display:none` for DP-014003, so real users of this account never
  see it; the impact for accounts with Pagos Online enabled is unconfirmed (PO-01,
  `impacto_a_confirmar`).
- Unverified hypothesis: Estado.aspx registers its grid as
  `ASPx.createControl(ASPxClientGridView,'cpBody_gvDatos','gvDatos',…)` with a
  server-side state keyed by invoice ids; PagoOnline's grid has the same id and may
  read that session/callback state.
