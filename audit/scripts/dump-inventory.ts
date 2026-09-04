import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { login, BASE_URL } from '../support/auth.ts';
import { extractRawElements } from '../support/inventory.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, '..', 'inventory', 'raw');
fs.mkdirSync(RAW_DIR, { recursive: true });

function dump(name: string, data: unknown) {
  fs.writeFileSync(path.join(RAW_DIR, `${name}.json`), JSON.stringify(data, null, 2));
  console.log('dumped', name, Array.isArray(data) ? data.length : '');
}

const browser = await chromium.launch();
const page = await browser.newPage();
await login(page);

// --- Mi Cuenta + tabs ---
await page.goto(`${BASE_URL}/MiCuenta.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
dump('mi-cuenta-datos-personales', await extractRawElements(page));

await page.click('text=Dependientes');
await page.waitForTimeout(800);
dump('mi-cuenta-dependientes', await extractRawElements(page));

await page.click('text=Direccion');
await page.waitForTimeout(800);
dump('mi-cuenta-direccion', await extractRawElements(page));

// --- Estado de Cuenta ---
await page.goto(`${BASE_URL}/Estado.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
dump('estado-cuenta', await extractRawElements(page));

// --- Rastreo + modals ---
await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
dump('rastreo', await extractRawElements(page));

await page.click('text=DP01-00306834');
await page.waitForTimeout(1200);
dump('rastreo-movimientos-modal', await extractRawElements(page));
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);

await page.click('#cpBody_bpagar');
await page.waitForTimeout(500);
await page.click('text=Histórico');
await page.waitForTimeout(1200);
dump('rastreo-historico-modal', await extractRawElements(page));
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);

await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
await page.click('a[href^="dlg/Adjuntos.aspx"]');
const popup = await popupPromise;
if (popup) {
  await popup.waitForLoadState('domcontentloaded');
  await popup.waitForTimeout(800);
  dump('rastreo-adjuntos', await extractRawElements(popup));
  await popup.close();
}

// row detail expander
await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
try {
  await page.click('[class*="dxgv"][class*="Expand"], a[title*="Expand" i], img[alt*="Show" i]', { timeout: 3000 });
  await page.waitForTimeout(600);
  dump('rastreo-row-detail-expander', await extractRawElements(page));
} catch (e) {
  console.log('row expander click failed', (e as Error).message);
}

// --- Prueba de Exportacion ---
await page.goto(`${BASE_URL}/PruebaExportacion.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
dump('prueba-exportacion', await extractRawElements(page));

// --- PreAlerta ---
await page.goto(`${BASE_URL}/PreAlerta.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
dump('prealerta', await extractRawElements(page));

// --- Pago Online (sidebar hidden, direct nav) + Pagar Con dropdown (do not proceed further) ---
await page.goto(`${BASE_URL}/PagoOnline.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
dump('pago-online', await extractRawElements(page));

await page.click('#cpBody_bpagar');
await page.waitForTimeout(600);
dump('pago-online-pagarcon-dropdown', await extractRawElements(page));

// --- Login + Nueva Cuenta (unauthenticated, use a fresh context so we don't disturb the logged-in one) ---
const publicCtx = await browser.newContext();
const publicPage = await publicCtx.newPage();
await publicPage.goto(`${BASE_URL}/Login.aspx`, { waitUntil: 'domcontentloaded' });
await publicPage.waitForTimeout(1000);
dump('login', await extractRawElements(publicPage));

await publicPage.goto(`${BASE_URL}/NuevaCuenta.aspx`, { waitUntil: 'domcontentloaded' });
await publicPage.waitForTimeout(1000);
dump('nueva-cuenta', await extractRawElements(publicPage));

await publicCtx.close();
await page.close();
await browser.close();
console.log('DONE');
