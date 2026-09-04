# Phase 4 ran as 4 parallel workers (one browser context each) merged by `_consolidate.ts`; resume workers after a rate-limit cut instead of relaunching

Mechanics that worked (2026-09-03/04):
- Split by screen group with distinct finding-id prefixes (`LG-/NC-`, `MC-/SH-`, `RA-`, `EC-/PE-/PA-/PO-`) so partial findings merge without collisions. Each worker logs every case × instance as one JSON line via `logCase()` in `support/phase4.ts` → `reports/execution-log/<group>.jsonl`, and findings to `findings/partial/<group>.json`.
- `scripts/phase4/_consolidate.ts` merges everything into `findings/findings.json` and rewrites only the *Coverage* and *Omitted* sections of `reports/execution-log.md` (other sections are hand-written and survive re-runs). It validates schema, screenshot presence, evidence paths, duplicate ids, and moves any text a worker put in `patron_relacionado` into `patron_sugerido_fase7` (Phase 7 owns that field). Last record per `group|screen|caseId|instance` wins, so re-logging a case supersedes the earlier line; a `<group>.dedup.jsonl` file, if present, is preferred over the raw one.
- `scripts/phase4/_coverage-gaps.ts` diffs logged case ids per screen against a hand-encoded §13 map — it caught 4 never-logged not-applicable cases (AX-02 on grid-only screens, AX-03 on Datos Personales) that were then logged as `omitted` with a reason.

Gotchas:
- All four workers were killed mid-run by an API session rate limit (HTTP 429). Resuming each agent with a message (same transcript) after the reset was far cheaper than relaunching: they re-read their own jsonl/findings from disk and continued. Ask them explicitly to re-check disk state first so nothing is double-run.
- Workers tend to fill `patron_relacionado` with useful hints despite the "leave null" rule; keep the hint rather than fighting it.
- Workers promote console noise with "no visible impact" (e.g. LG-18 blocked http jQuery 1.7.1) — review each `servidor`/`robustez` finding's `impacto_usuario` line and set `impacto_a_confirmar` where the impact is speculative.
