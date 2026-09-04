// Phase 4 / micuenta — DOM reconnaissance of MiCuenta.aspx (read-only).
// Dumps attributes, validators, handlers and chrome markup used by the static cases.
import { startSession, go, saveEvidence, saveText, shot } from '../../support/phase4.ts';

const s = await startSession({ name: 'p4-micuenta-recon' });
const page = s.page;
// tsx/esbuild keepNames injects __name() around named arrows inside page.evaluate — shim it.
await s.context.addInitScript('window.__name = (f) => f;');
await go(page, 'MiCuenta.aspx');
console.log('url', page.url(), 'title', await page.title());

const html = await page.content();
console.log('html saved', saveText('micuenta-recon-page', html, 'html'));

const recon = await page.evaluate(() => {
  const attrs = (el: Element) => {
    const o: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) o[a.name] = a.value;
    return o;
  };
  const labelFor = (el: Element) => {
    const id = el.id;
    const out: string[] = [];
    if (id) document.querySelectorAll(`label[for="${id}"]`).forEach((l) => out.push('for:' + (l.textContent || '').trim()));
    const wrap = el.closest('label');
    if (wrap) out.push('wrap:' + (wrap.textContent || '').trim());
    const lb = el.getAttribute('aria-labelledby');
    if (lb) out.push('labelledby:' + lb);
    // previous sibling label text (visual label without association)
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === 'LABEL') out.push('prevSiblingLabel(no-for?):' + (prev.textContent || '').trim() + ' for=' + prev.getAttribute('for'));
    return out;
  };
  const fields = Array.from(document.querySelectorAll('#cpBody_lefticontab1 input, #cpBody_lefticontab1 select, #cpBody_lefticontab2 input, #cpBody_lefticontab2 select, #cpBody_lefticontab4 input, #cpBody_lefticontab4 select, #cpBody_lefticontab3 input, #cpBody_lefticontab3 select, #cpBody_lefticontab3 a, #cpBody_lefticontab3 button')).map((el) => {
    const tab = el.closest('[id^="cpBody_lefticontab"]')?.id;
    const cs = getComputedStyle(el as HTMLElement);
    const r = (el as HTMLElement).getBoundingClientRect();
    return {
      tab,
      tag: el.tagName,
      attrs: attrs(el),
      value: (el as HTMLInputElement).value?.slice?.(0, 80),
      readOnly: (el as HTMLInputElement).readOnly,
      disabled: (el as HTMLInputElement).disabled,
      labels: labelFor(el),
      optionsCount: el.tagName === 'SELECT' ? (el as HTMLSelectElement).options.length : undefined,
      selectedText: el.tagName === 'SELECT' ? (el as HTMLSelectElement).selectedOptions[0]?.text : undefined,
      firstOptions: el.tagName === 'SELECT' ? Array.from((el as HTMLSelectElement).options).slice(0, 5).map((o) => ({ v: o.value, t: o.text })) : undefined,
      style: { color: cs.color, bg: cs.backgroundColor, display: cs.display, visibility: cs.visibility, opacity: cs.opacity, w: r.width, h: r.height },
    };
  });
  const validators = ((window as any).Page_Validators || []).map((v: any) => ({
    id: v.id,
    controltovalidate: v.controltovalidate,
    errormessage: v.errormessage,
    evaluationfunction: v.evaluationfunction,
    validationGroup: v.validationGroup,
    enabled: v.enabled,
    display: v.display,
    initialvalue: v.initialvalue,
    validationexpression: v.validationexpression,
    text: v.innerText,
  }));
  const form = document.forms[0];
  const tabs = Array.from(document.querySelectorAll('a[href^="#cpBody_lefticontab"]')).map((a) => {
    const li = a.closest('li');
    const cs = li ? getComputedStyle(li) : null;
    return { id: a.id, href: a.getAttribute('href'), text: a.textContent?.trim(), cls: a.className, attrs: attrs(a), liDisplay: cs?.display, liStyle: li?.getAttribute('style') };
  });
  const panes = Array.from(document.querySelectorAll('[id^="cpBody_lefticontab"]')).map((p) => ({ id: p.id, cls: p.className, display: getComputedStyle(p).display, attrs: attrs(p), textSample: (p as HTMLElement).innerText.replace(/\s+/g, ' ').slice(0, 300) }));
  const btnSel = ['#cpBody_Button1', '#cpBody_Button3', '#cpBody_bDireccion'];
  const buttons = btnSel.map((sel) => {
    const b = document.querySelector(sel) as HTMLInputElement | null;
    return b ? { sel, attrs: attrs(b), value: b.value, formNoValidate: b.formNoValidate, text: b.textContent } : { sel, missing: true };
  });
  const chrome = {
    closeSidebarBtn: Array.from(document.querySelectorAll('.close-sidebar-btn, button.hamburger, .hamburger-toggle-mobile, .mobile-toggle-nav, .mobile-toggle-header-nav')).map((b) => ({ tag: b.tagName, attrs: attrs(b), text: b.textContent?.trim(), html: b.outerHTML.slice(0, 400), display: getComputedStyle(b).display, rect: b.getBoundingClientRect().width })),
    userMenu: Array.from(document.querySelectorAll('.header-btn-lg a.p-0.btn, a.p-0.btn, [data-toggle="dropdown"]')).map((a) => ({ tag: a.tagName, attrs: attrs(a), text: a.textContent?.trim(), html: a.outerHTML.slice(0, 500) })),
    salir: Array.from(document.querySelectorAll('[onclick*="Login.aspx"], a:not([href=""])')).filter((a) => /salir/i.test(a.textContent || '')).map((a) => ({ tag: a.tagName, attrs: attrs(a), text: a.textContent?.trim(), html: a.outerHTML.slice(0, 400) })),
    dropdownMenuHtml: (document.querySelector('.dropdown-menu-right, .dropdown-menu') as HTMLElement | null)?.outerHTML.slice(0, 2000),
    sidebarLinks: Array.from(document.querySelectorAll('.vertical-nav-menu a, .app-sidebar a')).map((a) => ({ id: a.id, href: a.getAttribute('href'), text: a.textContent?.trim(), cls: a.className, liCls: a.closest('li')?.className, liDisplay: a.closest('li') ? getComputedStyle(a.closest('li')!).display : null })),
    footer: (document.querySelector('.app-footer, footer, .app-wrapper-footer') as HTMLElement | null)?.outerHTML.slice(0, 3000),
    footerLinks: Array.from(document.querySelectorAll('.app-footer a, footer a, .app-wrapper-footer a')).map((a) => ({ href: a.getAttribute('href'), text: a.textContent?.trim(), onclick: a.getAttribute('onclick'), target: a.getAttribute('target') })),
  };
  const inlineScripts = Array.from(document.querySelectorAll('script:not([src])')).map((sc) => sc.textContent || '').filter((t) => /tab|hash|lefticontab|Provincia|Ciudad|Sector|__doPostBack|onchange|confirm|WebForm_/i.test(t)).map((t) => t.replace(/\s+/g, ' ').slice(0, 1500));
  const scriptSrcs = Array.from(document.querySelectorAll('script[src]')).map((sc) => sc.getAttribute('src'));
  const selectsWithHandlers = Array.from(document.querySelectorAll('select')).map((sel) => ({ id: sel.id, onchange: sel.getAttribute('onchange'), hasOnchangeProp: !!(sel as any).onchange, disabled: sel.disabled, cls: sel.className, options: sel.options.length }));
  return {
    title: document.title,
    formAction: form?.action,
    formOnsubmit: form?.getAttribute('onsubmit'),
    formMethod: form?.method,
    eventValidation: !!document.querySelector('#__EVENTVALIDATION'),
    hasWebFormsJs: typeof (window as any).WebForm_DoPostBackWithOptions,
    hasPageValidators: !!(window as any).Page_Validators,
    validatorsCount: validators.length,
    validators,
    devexpress: { ASPx: typeof (window as any).ASPx, ASPxClientEdit: typeof (window as any).ASPxClientEdit },
    fields,
    tabs,
    panes,
    buttons,
    chrome,
    selectsWithHandlers,
    inlineScripts,
    scriptSrcs,
    lang: document.documentElement.lang,
    landmarks: { main: document.querySelectorAll('main,[role=main]').length, nav: document.querySelectorAll('nav,[role=navigation]').length, h1: Array.from(document.querySelectorAll('h1')).map((h) => h.textContent?.trim()) },
  };
});
console.log(saveEvidence('micuenta-recon', recon));
console.log(JSON.stringify({ title: recon.title, formAction: recon.formAction, formOnsubmit: recon.formOnsubmit, validators: recon.validators, buttons: recon.buttons, tabs: recon.tabs, panes: recon.panes.map((p: any) => ({ id: p.id, cls: p.cls, display: p.display })), selects: recon.selectsWithHandlers, devexpress: recon.devexpress, lang: recon.lang, landmarks: recon.landmarks, scriptSrcs: recon.scriptSrcs }, null, 1));
console.log('FIELDS');
for (const f of recon.fields) console.log(f.tab, f.tag, JSON.stringify(f.attrs), 'ro=' + f.readOnly, 'dis=' + f.disabled, 'labels=' + JSON.stringify(f.labels), f.optionsCount !== undefined ? 'opts=' + f.optionsCount + ' sel=' + f.selectedText : '', JSON.stringify(f.style));
console.log('CHROME', JSON.stringify(recon.chrome, null, 1));
console.log('INLINE', JSON.stringify(recon.inlineScripts, null, 1));
await shot(page, 'p4-micuenta-recon', true);
await s.close();
