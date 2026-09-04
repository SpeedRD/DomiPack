# Four concurrent independent sessions with the same account stay alive (NV-11 re-verified at Phase 4 start)

Re-verified 2026-09-03 with `audit/scripts/phase4/nv11-concurrency-4ctx.ts`: four
separate Playwright contexts each ran their own `login()` sequentially (each login
took ~14-15s), all four stayed authenticated immediately after the last login and
again after a 10s wait. Extends the Phase 2 result (3 contexts) to 4, enough for
the four parallel Phase 4 workers.

Bonus check: `page.evaluate(() => …)` with a real arrow function works under
`npx tsx` (no `__name` helper error) — the string-script workaround in
`support/inventory.ts` is only needed for named/nested function declarations, not
for simple arrow callbacks.
