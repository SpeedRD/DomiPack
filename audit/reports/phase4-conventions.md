# Phase 4 — execution conventions (read before running any case)

Scope and rules are those of `audit/matrix/test-matrix.md` (§Scope guardrails, §13
applicability map, §14 execution notes). This file only fixes the mechanics so
parallel workers produce mergeable output.

## Hard rules (repeated on purpose)
1. **Non-destructive.** Never fire: PreAlerta `#cpBody_bSend`; PagoOnline `#cpBody_bpagar`
   flow / `#cpBody_bCheckOut`; Nueva Cuenta `#bSend`; Mi Cuenta `#cpBody_Button1`,
   `#cpBody_Button3`, `#cpBody_bDireccion`; Login `Recuperar mi Contraseña?`.
   STATIC-ONLY = fill + inspect client-side behavior + abandon. Still logged as
   `executed-static`, never as a skip.
   **Exception (matrix review correction):** per-row PDF/print/download icons on
   Estado and Prueba de Exportación are READ actions — click them for real and
   verify the download/render.
2. **Session hazard.** Never `goto` `Login.aspx` or `/` in an authenticated context
   except as the LAST action of that context (NV-10 / BT-08 `Salir`). `go()` in
   `support/phase4.ts` refuses it on purpose.
3. **No fixing.** Report only. Never patch or "improve" the audited app.
4. **Evidence-based routes only.** New URL found mid-run (link/redirect/form action)
   → log it under "Sitemap additions" in your group log with the evidence; do not
   explore beyond a single confirming GET.
5. **Not a pentest.** TF-05 / TF-07 / SL-07 / NV-07 are validation probes. If
   something looks like a real vulnerability, note it neutrally, do not dig.

## Mechanics
- Scripts: `audit/scripts/phase4/<group>-<topic>.ts`, run with `npx tsx <file>`.
  Use `startSession()` from `audit/support/phase4.ts` (own browser + context + login).
- Log **every case × instance** with `logCase()` → `audit/reports/execution-log/<group>.jsonl`
  (`pass | fail | omitted | executed-static`). `omitted` requires a `reason`.
- Screens/groups and finding-id prefixes (one context per group; prefixes avoid
  collisions when merging):

  | group | screens | finding prefix |
  |---|---|---|
  | `login` | Login, Nueva Cuenta (public) | `LG-` (Login), `NC-` (Nueva Cuenta) |
  | `micuenta` | Mi Cuenta ×3 tabs + shared chrome (sidebar, user menu, footer) | `MC-`, `SH-` (shared) |
  | `rastreo` | Rastreo + modals + Adjuntos dialog | `RA-` |
  | `docs` | Estado de Cuenta, Prueba de Exportación, PreAlerta, PagoOnline | `EC-`, `PE-`, `PA-`, `PO-` |

- Findings: write to `audit/findings/partial/<group>.json` as a JSON array using the
  schema below. The coordinator merges into `audit/findings/findings.json`.
- Screenshot per finding: `audit/screenshots/<finding-id>.png` (use `shot(page, id)`).
  Extra evidence: `audit/logs/evidence/<finding-id>-*.{json,html,txt}` via
  `saveEvidence()` / `saveText()`; server-error bodies are auto-saved by
  `attachErrorBodyCapture` as `audit/logs/evidence/<session>-http<status>-<n>.html`.
- axe: `runAxe(page, '<screen>[-<viewport>]')` → `audit/logs/axe/*.json`.
- Console/network for the whole session land in `audit/logs/console/<session>.log` and
  `audit/logs/network/<session>.json` when the page closes (always call `s.close()`).
- Group summary (markdown): `audit/reports/execution-log/<group>.md` with: per-screen
  table of applicable / executed / passed / failed / omitted, the omitted list with
  reasons, sitemap additions (if any), and lessons. Keep it updated as you go.
- Lessons: one file per discovery in `audit/notes/<slug>.md`, summary line first;
  check existing notes to avoid duplicates.

## Finding schema (`audit/findings/partial/<group>.json`)
```json
{
  "id": "RA-01",
  "pantalla": "Rastreo > Historial Guías (modal)",
  "url": "https://clientes.domipack.com/Rastreo.aspx",
  "componente": "#cpBody_lDesde / #cpBody_lHasta + Buscar",
  "categoria": "validacion",            // funcional | servidor | validacion | ux-ui | responsive | accesibilidad | copy-contenido | robustez
  "severidad": "mayor",                 // bloqueante | critico | mayor | menor
  "descripcion": "…",
  "pasos_para_reproducir": ["1. …", "2. …"],
  "comportamiento_actual": "…",
  "comportamiento_esperado": "…",
  "impacto_usuario": "…",
  "evidencia": ["audit/screenshots/RA-01.png", "audit/logs/evidence/RA-01-response.html"],
  "propuesta_preliminar": "…",
  "info_tecnica": "selectors, request/response, console fragment (quoted, not from memory)",
  "patron_relacionado": null,
  "caso_matriz": ["DR-01"],             // extra: matrix case ids that produced it
  "impacto_a_confirmar": false          // extra: true when promoted as 'impact to confirm'
}
```
Write findings in Spanish (the report language); keep ids stable.

## Triage rule
A ≥400 response or a console warning/error is NOT a finding by itself. Promote only
with observable impact (functional, visual, UX, robustness). Reasonable doubt →
promote with `impacto_a_confirmar: true`. Background noise with zero effect → mention
in the group summary only.
