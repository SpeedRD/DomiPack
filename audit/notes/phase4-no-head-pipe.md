# Never pipe a Phase 4 script through `head` — it kills the run before `s.close()` and the console/network logs are lost

`npx tsx audit/scripts/phase4/x.ts | head -150` looked harmless, but once `head` had its 150
lines it exited, the next `console.log` in the script hit EPIPE and Node died before
`s.close()` ran — so `audit/logs/console/p4-rastreo-recon.log` and
`audit/logs/network/p4-rastreo-recon.json` were never written (capture.ts writes them on
page close). Seen 2026-09-03 with `rastreo-recon.ts`.

Rule: redirect to a file in the scratchpad (`> $S/x.log 2>&1`) and `grep`/`cut` the file
afterwards. Same for backgrounded parallel runs. (The `__name` shim lesson lives in
`tsx-evaluate-name-shim.md`; the rastreo scripts use the string form
`window.__name = window.__name || (function(f){return f;})` at context level so popups get it too.)
