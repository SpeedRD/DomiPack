import { Page } from 'playwright';

export interface RawElement {
  tag: string;
  role: string | null;
  type: string | null;
  id: string;
  name: string;
  classes: string;
  text: string;
  label: string;
  placeholder: string;
  href: string;
  onclick: string;
  disabled: boolean;
  checked: boolean | null;
  visible: boolean;
}

// NOTE: kept as a plain JS source string (not a TS function passed to
// page.evaluate) because tsx/esbuild injects a `__name(...)` helper call
// into transpiled function bodies for name-preservation, and that helper
// does not exist in the browser context that page.evaluate serializes into
// — passing a string sidesteps the transform entirely.
const EXTRACT_SCRIPT = `
(function () {
  function labelFor(el) {
    var id = el.getAttribute('id');
    if (id) {
      var lbl = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (lbl && lbl.textContent) return lbl.textContent.trim();
    }
    var aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();
    var closestLabel = el.closest('label');
    if (closestLabel && closestLabel.textContent) return closestLabel.textContent.trim();
    var title = el.getAttribute('title');
    if (title) return title.trim();
    return '';
  }

  var selectors = [
    'a', 'button', 'input', 'select', 'textarea',
    '[role="button"]', '[role="dialog"]', '[role="grid"]', '[role="navigation"]',
    'table',
    '[class*="dxgv"]', '[class*="dxbutton"]', '[class*="dxb"]',
    '[class*="pag"]', '[class*="breadcrumb"]', '[class*="modal"]', '[class*="popup"]',
    '[class*="alert"]', '[class*="message"]', '[class*="valid"]', '[class*="error"]',
    '[onclick]'
  ];
  var seen = new Set();
  var out = [];
  document.querySelectorAll(selectors.join(',')).forEach(function (el) {
    if (seen.has(el)) return;
    seen.add(el);
    var tag = el.tagName.toLowerCase();
    var style = window.getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    var visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width * rect.height > 0;
    var text = (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 160);
    out.push({
      tag: tag,
      role: el.getAttribute('role'),
      type: el.type || null,
      id: el.getAttribute('id') || '',
      name: el.name || '',
      classes: el.getAttribute('class') || '',
      text: text,
      label: labelFor(el),
      placeholder: el.placeholder || '',
      href: el.getAttribute('href') || '',
      onclick: el.getAttribute('onclick') || '',
      disabled: el.disabled || false,
      checked: 'checked' in el ? el.checked : null,
      visible: visible
    });
  });
  return out;
})()
`;

/**
 * Walks the DOM of the current page and returns every element that looks
 * interactive or informational (form fields, buttons, links, grids,
 * pagination, status/validation text, dialogs, breadcrumbs).
 * This is a raw dump — curation into the component-inventory schema
 * (type/name/action) happens afterward by hand.
 */
export async function extractRawElements(page: Page): Promise<RawElement[]> {
  return page.evaluate(EXTRACT_SCRIPT);
}
