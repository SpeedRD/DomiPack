# Session behavior findings (Phase 2 sub-task)

Investigates the Phase 1 observation that "a new tab/context in an authenticated
session appears to lose the session despite an unchanged cookie," specifically to
answer: **does logging in from a second, independent browser context invalidate
the first session?** This determines whether Phase 4 can run parallel subagents
against a single test account.

All tests used real logins against `https://clientes.domipack.com` with the test
account `DP-014003`, via Playwright (`audit/scripts/session-concurrency-test.ts`,
`session-triple-test.ts`, `session-newtab-test.ts`, `session-relogin-visit-test.ts`).
No destructive actions were taken — only login + navigation to `Rastreo.aspx`.

## Answer to the key question

**No — a second (or third) independent login does NOT invalidate an earlier
session.** Two separate `BrowserContext`s (separate cookie jars, each doing its
own fresh `login()` POST) both stayed authenticated simultaneously, before and
after the other logged in, and after an 8-10s wait. Repeated with 3 concurrent
independent sessions with the same result — all 3 stayed logged in.

```
Context A logs in -> alive
Context B logs in independently (separate cookies) -> alive
Re-check Context A immediately after B's login -> still alive
Re-check both after 8s -> both still alive
(repeated with 3 contexts, sequential logins, 10s wait -> all 3 still alive)
```

**Conclusion for Phase 4: it is safe to run parallel subagents against this
application with a single test account**, each in its own browser
context/session (own login), *as long as no subagent navigates back to
`Login.aspx` (or root `/`) after authenticating* — see the next finding, which
is the real hazard, not concurrent logins.

## Related finding: revisiting Login.aspx self-invalidates that session

Reproduced and confirmed via `session-relogin-visit-test.ts`: after a successful
login, navigating that SAME page/context back to `Login.aspx` causes all
subsequent requests in that context to be redirected to `Login.aspx` again — the
session is effectively ended. This is self-inflicted (caused by the page's own
navigation to Login.aspx), not caused by another session logging in.

```
Log in -> Rastreo.aspx loads fine
Navigate same page to Login.aspx -> lands on Login.aspx (expected, it's the login page)
Navigate same page to Rastreo.aspx again -> redirected BACK to Login.aspx (session now dead)
```

Likely cause: Login.aspx's server-side Page_Load probably clears/abandons the
session (or clears an auth flag) whenever it's loaded, regardless of whether the
request was already authenticated — a common (if user-hostile) ASP.NET Web
Forms pattern to guarantee a "clean" login form. This was not tested to
determine the exact mechanism (would require inspecting server responses/headers
beyond this audit's scope), just confirmed as reproducible behavior.

**Practical implication for Phase 4:** subagents (and the "Salir" logout
control, which does `window.location.href='/Login.aspx'`) must never be
navigated back to Login.aspx mid-task unless the intent is to end that session
for good — including via the shared "Salir" control documented in
`audit/inventory/components/_shared-chrome.json`. Each subagent should use its
own dedicated browser context and only visit Login.aspx once, to initially log
in.

## Related finding: new tab in the same context does NOT reproduce the Phase 1 "session loss" note

Phase 1's sitemap.json flagged: *"A fresh Playwright page (new tab) in the same
authenticated browser context, opened after login, was redirected to
Login.aspx even with the session cookie present."*

This was retested 4 times (`session-newtab-test.ts`, one initial run + 3
repeats) — opening a second page in the same context (same shared cookies,
without visiting Login.aspx) — and every time the second tab, and the original
tab on reload, stayed authenticated. **Not reproduced in this phase.**

Working theory: the original Phase 1 observation was likely a timing/race
artifact — login has a variable-length delay (~4-20s, intermediate `document.title`
of "Loading https://.../Rastreo.aspx") before the server-side session is fully
established, so a new tab opened in that narrow window immediately after the
cookie is set (but before server-side session state finishes initializing)
could catch an inconsistent state. It's also possible the original observation
was actually an instance of the Login.aspx self-invalidation above, if that
crawl path happened to revisit Login.aspx around the same time (sitemap.json's
own methodology notes mention exactly that: *"First observed when the original
crawl script visited Login.aspx again mid-session for capture purposes"* — that
note is attached to the Login.aspx-revisit finding, suggesting the two
observations may have been conflated in Phase 1).

**Practical implication for Phase 4:** don't treat "new tab, same context" as
inherently risky based on Phase 1's note — it did not reproduce. Still, prefer
giving each subagent time to complete its login (wait for the post-login
redirect away from Login.aspx, as `support/auth.ts`'s `login()` helper already
does) before opening more tabs/pages in that context, to avoid the timing
window described above.

## Recommendation for Phase 4 scoping

- Safe: N subagents, each with its **own independent browser context** (own
  cookie jar) that performs its **own login** via the existing `login()`
  helper, running in parallel. Confirmed with up to 3 concurrent sessions.
- Unsafe / avoid: any subagent navigating to `Login.aspx` (directly, via the
  "Salir" control, or via root `/`) while other subagents still need their
  session — this only kills the navigating subagent's own session, but should
  still be sequenced as "last action" per subagent, not a mid-task step.
- Not established either way: behavior beyond 3 concurrent sessions, and
  server-side session limits (e.g. a max concurrent-session cap higher than
  3) — not tested, low priority unless Phase 4 plans more than a handful of
  parallel subagents.
