# Observing WebForms client-side validation without ever submitting (STATIC-ONLY forms)

Used for PreAlerta (`audit/scripts/phase4/docs-prealerta.ts`), whose submit creates real data.

1. **Safety nets before any interaction** (belt and braces, all logged):
   - `page.route('**/PreAlerta.aspx', abort POST)` — even an accidental Enter cannot reach the server.
   - In-page guard: `form.submit = counter; form.addEventListener('submit', preventDefault, capture); window.__doPostBack = counter`.
   - Never `click()` the submit and never `keyboard.press('Enter')` inside the form.
   Result for the whole run: `blocked POSTs=0, intercepted submits=0` — nothing tried to submit.
2. **Native HTML5 validation is inspectable without submit**: `el.checkValidity()`,
   `el.validity.*`, `el.validationMessage`, and `form.reportValidity()` (shows the browser
   bubble on the first invalid field, moves focus, returns false, does NOT submit).
   Screenshot right after `reportValidity()` captures the bubble (`prealerta-tf01-empty.png`).
3. **ASP.NET validators**: check `window.Page_Validators` (null here → no server-side
   validator controls; only `required` attributes).
4. **Number inputs**: `page.fill()` refuses non-numeric text on `type=number`; use
   `locator.pressSequentially()` / `keyboard.insertText()` and read `validity.badInput`.
5. **File inputs**: `setInputFiles()` with tiny fixtures under `audit/scripts/phase4/fixtures/`;
   inspect `accept`, `multiple`, `files[0]`, `checkValidity()` — no upload happens until submit.
6. Validation bubbles come from the **browser**, in the browser UI language (English in
   headless Chromium here even with `locale: 'es-DO'`); do not report their wording as the
   app's copy — report that the app defines none.
