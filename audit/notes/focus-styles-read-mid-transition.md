# Focus-indicator checks: read computed styles only after CSS transitions settle

Bootstrap 4 `.form-control` and `.btn` transition `border-color`/`box-shadow` over 150 ms. Reading
`getComputedStyle()` immediately after `keyboard.press('Tab')` returns the *starting* values
(`box-shadow: rgba(0,0,0,0) 0px 0px 0px 0px`, unchanged border), which made the first AX-04 run in
`micuenta-responsive-axe.ts` report "no focus indicator" on every text input. Re-measuring after a
500 ms wait (`micuenta-focus-check.ts`) showed the inputs DO get `rgba(0,123,255,.25) 0 0 0 3.2px`
plus a border change; the real gaps are sidebar links, the hamburger, footer links and
`.btn-primary` (shadow with 0 px spread).

Rules of thumb baked into `_micuenta-common.ts#FOCUS_FN`:
- wait ≥400 ms after moving focus before reading styles;
- a `box-shadow` whose colour has alpha 0 **or** whose offsets/blur/spread are all 0 px is not an indicator;
- compare `border-color`/`background` against the blurred state of the same element;
- keep the corrected rows in the jsonl (`CORRECTION …` instance) rather than deleting the wrong ones.
