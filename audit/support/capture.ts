import { Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_ROOT = path.join(__dirname, '..');

export function attachCapture(page: Page, screenName: string): void {
  const consoleLines: string[] = [];
  const networkEntries: unknown[] = [];

  page.on('console', (msg) => {
    consoleLines.push(
      JSON.stringify({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString(),
      })
    );
  });

  page.on('response', async (response) => {
    networkEntries.push({
      url: response.url(),
      status: response.status(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      timestamp: new Date().toISOString(),
    });
  });

  page.on('close', () => {
    const consoleDir = path.join(AUDIT_ROOT, 'logs', 'console');
    const networkDir = path.join(AUDIT_ROOT, 'logs', 'network');
    fs.mkdirSync(consoleDir, { recursive: true });
    fs.mkdirSync(networkDir, { recursive: true });
    fs.writeFileSync(path.join(consoleDir, `${screenName}.log`), consoleLines.join('\n'));
    fs.writeFileSync(path.join(networkDir, `${screenName}.json`), JSON.stringify(networkEntries, null, 2));
  });
}

export async function screenshot(page: Page, screenName: string): Promise<void> {
  const screenshotsDir = path.join(AUDIT_ROOT, 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotsDir, `${screenName}.png`), fullPage: true });
}
