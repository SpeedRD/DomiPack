# Historial modal: Esc only works with focus inside; the × is covered by the top bar — close it with a backdrop click in scripts

`#modal_Historial` (Bootstrap 4, `modal-dialog modal-full`) is positioned at `y≈28` so its
`.modal-header` (title + `×`, height 63) sits under the 60 px `.app-header` (position
relative, z-index 10 — yet `elementFromPoint` at the × centre returns
`DIV.app-header__content`, i.e. the header paints above the modal). Playwright's normal
click on `#modal_Historial .close` times out with "intercepted"; a click on the bottom
~20 px of the × does work at 1440; at 375 the whole header incl. × is hidden.

Focus is never moved into the modal on open (stays on the "Histórico" trigger). Bootstrap
listens for `keydown.dismiss` on the modal element, so pressing `Escape` right after
opening does nothing; after Tabbing into the modal, Escape closes it. Backdrop click
always closes it.

Harness rule derived from this: after opening the Historial modal, close it with
`page.mouse.click(5, height-40)` (backdrop) — `keyboard.press('Escape')` alone leaves it
open and the next click on anything under the backdrop times out (this silently broke
`rastreo-modals.ts` and the first `rastreo-responsive-axe.ts` run).

The DevExpress Movimientos popup (`cpBody_ppCambioGuia`) is the opposite: Esc always
closes it (`closeOnEscape:true`), backdrop click does not (`closeAction:'CloseButton'`),
and its close button is a `div` with no tabindex — nothing in it is keyboard focusable.
