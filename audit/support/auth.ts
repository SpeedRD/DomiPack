import { Page } from 'playwright';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

export const BASE_URL = 'https://clientes.domipack.com';
export const LOGIN_URL = `${BASE_URL}/MiCuenta.aspx`;

export async function login(page: Page): Promise<void> {
  const username = process.env.DP_USERNAME || 'DP-014003';
  const password = process.env.DP_PASSWORD;

  if (!password) {
    throw new Error('DP_PASSWORD is not set in /audit/.env');
  }

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await page.fill('#lUser', username);
  await page.fill('#lPass', password);
  await page.click('a[onclick="login()"]');
  await page.waitForURL((url) => !url.href.includes('Login.aspx'), { timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
}
