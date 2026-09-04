import { chromium } from 'playwright';
import { login, BASE_URL } from '../support/auth.ts';
import { screenshot } from '../support/capture.ts';

const browser = await chromium.launch();
const page = await browser.newPage();
await login(page);

// Mi Cuenta tabs
await page.goto(`${BASE_URL}/MiCuenta.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.click('text=Dependientes');
await page.waitForTimeout(800);
await screenshot(page, 'mi-cuenta-dependientes');

await page.click('text=Direccion');
await page.waitForTimeout(800);
await screenshot(page, 'mi-cuenta-direccion');

// Rastreo modals
await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.click('text=DP01-00306834');
await page.waitForTimeout(1200);
await screenshot(page, 'rastreo-verguia-modal');
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);

await page.click('#cpBody_bpagar');
await page.waitForTimeout(500);
await page.click('text=Histórico');
await page.waitForTimeout(1200);
await screenshot(page, 'rastreo-historico');
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);

// Adjuntos dialog (opens as a popup)
await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
await page.click('a[href^="dlg/Adjuntos.aspx"]');
const popup = await popupPromise;
if (popup) {
  await popup.waitForLoadState('domcontentloaded');
  await screenshot(popup, 'adjuntos-dialog');
  await popup.close();
}

// Pagos Online "Pagar Con" dropdown (not proceeding into payment flow)
await page.goto(`${BASE_URL}/PagoOnline.aspx`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.click('#cpBody_bpagar');
await page.waitForTimeout(600);
await screenshot(page, 'pago-online-pagarcon-dropdown');

await page.close();
await browser.close();
