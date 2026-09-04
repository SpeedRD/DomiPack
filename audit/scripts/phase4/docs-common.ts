// Shared bits for the `docs` group scripts (Estado, Prueba de Exportación, PreAlerta, PagoOnline).
import { Page } from 'playwright';
import { logCase, CaseResult } from '../../support/phase4.ts';

export const GROUP = 'docs';
export const SCREEN = {
  estado: 'Estado de Cuenta',
  prueba: 'Prueba de Exportación',
  prealerta: 'PreAlerta',
  pago: 'PagoOnline',
} as const;

/** tsx/esbuild injects `__name(...)` into nested functions inside page.evaluate; shim it in-page. */
export async function shimName(page: Page): Promise<void> {
  await page.addInitScript('window.__name = window.__name || function (f) { return f; };');
  await page.evaluate('window.__name = window.__name || function (f) { return f; };').catch(() => {});
}

export function L(screen: string, caseId: string, instance: string, result: CaseResult['result'], extra: Partial<CaseResult> = {}) {
  logCase({ group: GROUP, screen, caseId, instance, result, ...extra });
}

/** Horizontal overflow + grid container info for RS/TB-07 cases. */
export async function overflowInfo(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const grid = document.querySelector('#cpBody_gvDatos') as HTMLElement | null;
    let scrollContainer: string | null = null;
    let el: HTMLElement | null = grid;
    while (el && el !== document.body) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth) {
        scrollContainer = `${el.tagName.toLowerCase()}#${el.id}.${el.className.toString().split(' ').join('.')}`;
        break;
      }
      el = el.parentElement;
    }
    const wide = Array.from(document.querySelectorAll('body *'))
      .filter((n) => (n as HTMLElement).getBoundingClientRect().right > de.clientWidth + 1)
      .slice(0, 8)
      .map((n) => `${n.tagName.toLowerCase()}#${(n as HTMLElement).id}.${(n as HTMLElement).className.toString().split(' ').slice(0, 3).join('.')}@${Math.round((n as HTMLElement).getBoundingClientRect().right)}`);
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      overflow: de.scrollWidth > de.clientWidth,
      gridWidth: grid ? grid.getBoundingClientRect().width : null,
      gridRight: grid ? Math.round(grid.getBoundingClientRect().right) : null,
      gridScrollContainer: scrollContainer,
      hiddenAdaptiveCells: grid ? grid.querySelectorAll('td.dxgvAIC, .dxgvAIC').length : 0,
      adaptiveDetailButtonsVisible: grid ? Array.from(grid.querySelectorAll('a.dxgvADSB')).filter((a) => (a as HTMLElement).offsetParent !== null).length : 0,
      wideElements: wide,
      sidebarVisible: (() => {
        const sb = document.querySelector('.app-sidebar') as HTMLElement | null;
        if (!sb) return null;
        const r = sb.getBoundingClientRect();
        return r.width > 0 && r.left >= 0 && r.left < de.clientWidth;
      })(),
      mobileToggle: (() => {
        const t = document.querySelector('.mobile-toggle-nav') as HTMLElement | null;
        return t ? t.offsetParent !== null : null;
      })(),
    };
  });
}

/** Tab through the page N times, recording focused element + whether a focus indicator is visible. */
export async function tabTraverse(page: Page, n = 40) {
  const stops: any[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        cls: el.className?.toString().slice(0, 60),
        text: (el.textContent || (el as HTMLInputElement).value || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        tabindex: el.getAttribute('tabindex'),
        outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
        boxShadow: cs.boxShadow,
        focusVisible: (() => { try { return el.matches(':focus-visible'); } catch { return null; } })(),
        size: `${Math.round(r.width)}x${Math.round(r.height)}`,
        visible: r.width > 0 && r.height > 0,
      };
    });
    stops.push(info);
    if (info && info.tag === 'body') break;
  }
  return stops;
}
