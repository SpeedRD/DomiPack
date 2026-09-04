// Shared helpers for the micuenta group scripts (Phase 4).
import { Page } from 'playwright';
import { logCase, CaseResult, visibleText } from '../../support/phase4.ts';

export const GROUP = 'micuenta';
export const NAME_SHIM = 'window.__name = (f) => f;'; // tsx/esbuild keepNames helper shim for page.evaluate

export function log(screen: string, caseId: string, instance: string, result: CaseResult['result'], reason?: string, findingIds?: string[], evidence?: string[]) {
  logCase({ group: GROUP, screen, caseId, instance, result, reason, findingIds, evidence });
}

export const TAB = {
  datos: { link: '#cpBody_ltab1', pane: '#cpBody_lefticontab1', screen: 'Mi Cuenta > Datos Personales' },
  dependientes: { link: '#cpBody_ltab2', pane: '#cpBody_lefticontab2', screen: 'Mi Cuenta > Dependientes' },
  direccion: { link: '#cpBody_ltab4', pane: '#cpBody_lefticontab4', screen: 'Mi Cuenta > Direccion' },
  tarjetas: { link: '#cpBody_ltab3', pane: '#cpBody_lefticontab3', screen: 'Mi Cuenta > Tarjetas Registradas (hidden)' },
} as const;

export async function openTab(page: Page, tab: keyof typeof TAB): Promise<void> {
  const t = TAB[tab];
  await page.click(t.link);
  await page.waitForFunction((sel) => {
    const p = document.querySelector(sel) as HTMLElement | null;
    return !!p && getComputedStyle(p).display !== 'none' && p.classList.contains('active');
  }, t.pane, { timeout: 5000 });
  await page.waitForTimeout(300);
}

export interface ProbeResult {
  sel: string;
  inputLen: number;
  valueLen: number;
  valueEqualsInput: boolean;
  valueSample: string;
  maxlength: string | null;
  required: boolean;
  pattern: string | null;
  type: string;
  checkValidity: boolean;
  validationMessage: string;
  invalidClass: boolean;
  textDelta: string;
  overflowX: boolean;
  ms: number;
}

/** Fill a field client-side (never submits), then inspect what the DOM/browser did with the value. */
export async function probe(page: Page, sel: string, value: string, opts: { paste?: boolean } = {}): Promise<ProbeResult> {
  const before = await visibleText(page);
  const t0 = Date.now();
  if (opts.paste) {
    await page.focus(sel);
    await page.$eval(sel, (el) => ((el as HTMLInputElement).value = ''));
    await page.keyboard.insertText(value);
  } else {
    await page.fill(sel, value);
  }
  const ms = Date.now() - t0;
  const r = await page.$eval(sel, (el, input) => {
    const i = el as HTMLInputElement;
    return {
      valueLen: i.value.length,
      valueEqualsInput: i.value === input,
      valueSample: i.value.slice(0, 60),
      maxlength: i.getAttribute('maxlength'),
      required: i.required,
      pattern: i.getAttribute('pattern'),
      type: i.type,
      checkValidity: i.checkValidity(),
      validationMessage: i.validationMessage,
      invalidClass: i.classList.contains('is-invalid') || i.getAttribute('aria-invalid') === 'true',
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  }, value);
  const after = await visibleText(page);
  const textDelta = after === before ? '' : diffSummary(before, after);
  return { sel, inputLen: value.length, ...r, textDelta, ms };
}

function diffSummary(a: string, b: string): string {
  // crude: report the part of b not in a (first 200 chars)
  const wordsA = new Set(a.split(' '));
  const added = b.split(' ').filter((w) => !wordsA.has(w));
  return added.join(' ').slice(0, 200);
}

/** Contrast ratio helper executed in the page for an element's text vs. its effective background. */
export const CONTRAST_FN = `
(function(sel){
  const el = document.querySelector(sel); if(!el) return null;
  const parse = (s)=>{const m=s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p=m[1].split(',').map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
  const lum=(c)=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);};
  const blend=(fg,bg,a)=>({r:fg.r*a+bg.r*(1-a),g:fg.g*a+bg.g*(1-a),b:fg.b*a+bg.b*(1-a)});
  const cs=getComputedStyle(el);
  let fg=parse(cs.color); let bg=parse(cs.backgroundColor);
  let node=el; let opacity=1;
  while(node){ const s=getComputedStyle(node); opacity*=parseFloat(s.opacity||'1'); node=node.parentElement; }
  // effective background: walk up until non-transparent
  let bgNode=el; let eff=bg;
  while(bgNode && (!eff || eff.a===0)){ bgNode=bgNode.parentElement; if(!bgNode) break; eff=parse(getComputedStyle(bgNode).backgroundColor); }
  if(!eff||eff.a===0) eff={r:255,g:255,b:255,a:1};
  const white={r:255,g:255,b:255};
  const bgB = bg && bg.a>0 ? blend(bg, white, opacity) : eff;
  const fgB = blend(fg, bgB, opacity);
  const l1=lum(fgB), l2=lum(bgB);
  const ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  return {sel, color:cs.color, background:cs.backgroundColor, effectiveBg:bgB, opacity, fontSize:cs.fontSize, fontWeight:cs.fontWeight, ratio:Math.round(ratio*100)/100, text:(el.innerText||el.value||'').slice(0,40)};
})`;

export async function contrast(page: Page, sel: string) {
  return page.evaluate(`${CONTRAST_FN}(${JSON.stringify(sel)})`);
}

/** Describe the currently focused element + whether a focus indicator is visible. */
export const FOCUS_FN = `
(function(){
  const el=document.activeElement; if(!el) return null;
  const cs=getComputedStyle(el);
  const r=el.getBoundingClientRect();
  const id=el.id||''; const cls=(el.className&&el.className.baseVal!==undefined)?'':el.className;
  const shadowVisible = (sh)=>{ if(!sh||sh==='none') return false; const m=sh.match(/rgba?\\(([^)]+)\\)/); if(!m) return true; const p=m[1].split(',').map(Number); if(p.length>3 && p[3]===0) return false; const nums=sh.replace(/rgba?\\([^)]+\\)/,'').match(/-?[\\d.]+px/g)||[]; return nums.some(n=>parseFloat(n)!==0); };
  // border colour while focused vs. the same element's stylesheet colour when not focused (approximated by a temporary blur)
  const focusedBorder=cs.borderColor; el.blur(); const blurredBorder=getComputedStyle(el).borderColor; el.focus({preventScroll:true});
  const outlineVisible = cs.outlineStyle!=='none' && parseFloat(cs.outlineWidth)>0;
  return {tag:el.tagName,id,cls:String(cls).slice(0,60),text:(el.innerText||el.value||el.getAttribute('aria-label')||'').replace(/\\s+/g,' ').slice(0,40),
    outlineStyle:cs.outlineStyle,outlineWidth:cs.outlineWidth,outlineColor:cs.outlineColor,boxShadow:cs.boxShadow,focusedBorder,blurredBorder,
    visible:r.width>0&&r.height>0, inViewport: r.top>=0 && r.bottom<=innerHeight,
    focusVisible: (()=>{try{return el.matches(':focus-visible');}catch(e){return null;}})(),
    outlineVisible, shadowVisible: shadowVisible(cs.boxShadow), borderChanged: focusedBorder!==blurredBorder,
    indicator: outlineVisible || shadowVisible(cs.boxShadow) || focusedBorder!==blurredBorder};
})()`;

export async function focused(page: Page) {
  return page.evaluate(FOCUS_FN) as Promise<any>;
}

export async function overflowX(page: Page): Promise<{ scrollWidth: number; clientWidth: number; overflow: boolean }> {
  return page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
}

export function assertNotLogin(page: Page, where: string) {
  if (/Login\.aspx/i.test(page.url())) throw new Error(`Session lost at ${where}: ${page.url()}`);
}
