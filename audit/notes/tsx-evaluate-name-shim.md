# `__name is not defined` in page.evaluate under tsx — shim it with an init script

Under `npx tsx`, esbuild's keepNames wraps any *named* function/arrow declared inside a
`page.evaluate(() => { const attrs = (el) => … })` callback in a `__name(...)` helper call. The
helper exists in Node but not in the browser, so Playwright throws
`ReferenceError: __name is not defined` (seen 2026-09-03 in `micuenta-recon.ts`). Simple
top-level arrow callbacks without inner named functions are fine (see
`phase4-nv11-four-contexts.md`), which is why the smoke tests passed.

Fix used by the micuenta scripts (`_micuenta-common.ts` → `NAME_SHIM`):

```ts
await s.context.addInitScript('window.__name = (f) => f;');   // before the first go()
```

It applies to every page in the context from the next navigation on, so all evaluate
callbacks can use inner helpers freely. Alternative when the page is already loaded:
`await page.evaluate('window.__name = (f) => f')` once per navigation.
