// Phase 4 execution helper — thin wrapper over auth.ts + capture.ts so every
// case script (audit/scripts/phase4/*.ts) captures evidence the same way.
//
// Usage:
//   const s = await startSession({ name: 'rastreo-dr', auth: true });
//   ... run cases on s.page ...
//   await s.close();          // flushes console/network logs (capture.ts writes on page close)
//
// Rules baked in: never navigate an authenticated page to Login.aspx or '/'
// except as the very last action (session self-invalidation, NV-10/BT-08).
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { login, BASE_URL } from './auth.ts';
import { attachCapture } from './capture.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUDIT_ROOT = path.join(__dirname, '..');
export { BASE_URL, login };

export interface Session {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  name: string;
  close: () => Promise<void>;
  newPage: (subName: string) => Promise<Page>;
}

export interface StartOpts {
  name: string; // log file prefix, e.g. 'p4-rastreo-modals'
  auth?: boolean; // perform login() first (default true)
  viewport?: { width: number; height: number };
  headless?: boolean;
  acceptDownloads?: boolean;
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

/** Saves bodies of every >=400 text/html response for evidence (server error pages etc.). */
export function attachErrorBodyCapture(page: Page, name: string): void {
  const dir = path.join(AUDIT_ROOT, 'logs', 'evidence');
  ensureDir(dir);
  let n = 0;
  page.on('response', async (response) => {
    try {
      if (response.status() < 400) return;
      const ct = response.headers()['content-type'] || '';
      if (!ct.includes('html') && !ct.includes('json') && !ct.includes('text')) return;
      const body = await response.text().catch(() => '');
      if (!body) return;
      n += 1;
      const file = path.join(dir, `${name}-http${response.status()}-${n}.html`);
      fs.writeFileSync(
        file,
        `<!-- ${response.request().method()} ${response.url()} -> ${response.status()} @ ${new Date().toISOString()} -->\n` + body
      );
    } catch {
      /* ignore */
    }
  });
}

export async function startSession(opts: StartOpts): Promise<Session> {
  const browser = await chromium.launch({ headless: opts.headless ?? true });
  const context = await browser.newContext({
    viewport: opts.viewport ?? { width: 1440, height: 900 },
    acceptDownloads: opts.acceptDownloads ?? true,
    locale: 'es-DO',
  });
  const page = await context.newPage();
  attachCapture(page, opts.name);
  attachErrorBodyCapture(page, opts.name);
  if (opts.auth ?? true) {
    await login(page);
  }
  const extraPages: Page[] = [];
  return {
    browser,
    context,
    page,
    name: opts.name,
    newPage: async (subName: string) => {
      const p = await context.newPage();
      attachCapture(p, `${opts.name}-${subName}`);
      attachErrorBodyCapture(p, `${opts.name}-${subName}`);
      extraPages.push(p);
      return p;
    },
    close: async () => {
      for (const p of extraPages) await p.close().catch(() => {});
      await page.close().catch(() => {});
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}

/** Full-page screenshot to audit/screenshots/<name>.png. Use the finding id as name for findings. */
export async function shot(page: Page, name: string, fullPage = true): Promise<string> {
  const dir = path.join(AUDIT_ROOT, 'screenshots');
  ensureDir(dir);
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  return `audit/screenshots/${name}.png`;
}

/** Save any JSON evidence to audit/logs/evidence/<name>.json */
export function saveEvidence(name: string, data: unknown): string {
  const dir = path.join(AUDIT_ROOT, 'logs', 'evidence');
  ensureDir(dir);
  const file = path.join(dir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return `audit/logs/evidence/${name}.json`;
}

/** Save raw text/html evidence to audit/logs/evidence/<name>.<ext> */
export function saveText(name: string, text: string, ext = 'txt'): string {
  const dir = path.join(AUDIT_ROOT, 'logs', 'evidence');
  ensureDir(dir);
  const file = path.join(dir, `${name}.${ext}`);
  fs.writeFileSync(file, text);
  return `audit/logs/evidence/${name}.${ext}`;
}

/** Runs axe-core; writes full result to audit/logs/axe/<name>.json; returns a compact summary. */
export async function runAxe(page: Page, name: string) {
  const dir = path.join(AUDIT_ROOT, 'logs', 'axe');
  ensureDir(dir);
  const results = await new AxeBuilder({ page }).analyze();
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(results, null, 2));
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }));
  return { file: `audit/logs/axe/${name}.json`, violations: summary, count: results.violations.length };
}

/** Detects ASP.NET error pages / unhandled server errors in a page's HTML. */
export function serverErrorSignature(html: string): string | null {
  const sigs = [
    "Server Error in '/' Application",
    'Runtime Error',
    'Exception Details',
    'Stack Trace',
    'A potentially dangerous Request',
    'Description: An unhandled exception',
    'HttpRequestValidationException',
    'Sys.WebForms.PageRequestManagerServerErrorException',
    'Error del servidor',
  ];
  for (const s of sigs) if (html.includes(s)) return s;
  return null;
}

/** Returns true if the page currently sits on Login.aspx (session dead or redirected). */
export function onLogin(page: Page): boolean {
  return /Login\.aspx/i.test(page.url());
}

/** Read visible text of the page (trimmed) — quick way to look for validation messages. */
export async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim());
}

/** Convenience: navigate to a protected page and wait for DOM ready (no Login.aspx!). */
export async function go(page: Page, relative: string): Promise<void> {
  if (/Login\.aspx/i.test(relative) || relative === '/' || relative === '') {
    throw new Error('Refusing to navigate to Login.aspx / root while authenticated (session hazard). Do it explicitly with page.goto as the LAST action.');
  }
  await page.goto(`${BASE_URL}/${relative.replace(/^\//, '')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
}

/** Case bookkeeping: append a JSON line per case result to audit/reports/execution-log/<group>.jsonl */
export interface CaseResult {
  group: string; // e.g. 'rastreo'
  screen: string; // e.g. 'Rastreo'
  caseId: string; // e.g. 'DR-01'
  instance: string; // component instance, e.g. '#cpBody_lDesde/#cpBody_lHasta'
  result: 'pass' | 'fail' | 'omitted' | 'executed-static';
  findingIds?: string[];
  reason?: string; // for omitted, or short observation
  evidence?: string[]; // file paths
}
export function logCase(r: CaseResult): void {
  const dir = path.join(AUDIT_ROOT, 'reports', 'execution-log');
  ensureDir(dir);
  fs.appendFileSync(path.join(dir, `${r.group}.jsonl`), JSON.stringify({ ...r, ts: new Date().toISOString() }) + '\n');
  const tag = r.result.toUpperCase().padEnd(15);
  console.log(`[${tag}] ${r.screen} ${r.caseId} ${r.instance}${r.findingIds?.length ? ' -> ' + r.findingIds.join(',') : ''}${r.reason ? ' :: ' + r.reason : ''}`);
}

export const LONG_5K = 'A'.repeat(5000);
export const LONG_100K = 'A'.repeat(100000);
export const SPECIALS = `< > " ' & % \\ / ; { } | # =`;
export const XSS_PROBE = '<script>alert(1)</script>';
export const UNICODE = 'ñ á ü 你好 🚚 ‏rtl';
export const SQLISH = [`' OR 1=1 --`, `{{7*7}}`, `\${x}`];
export const EMAIL_INVALID = ['abc', 'abc@', '@x.com', 'a b@x.com', 'a@x', 'a@@x.com', 'a@x.com.'];
