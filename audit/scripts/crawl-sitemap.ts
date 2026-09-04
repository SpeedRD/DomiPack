import { chromium } from 'playwright';
import { login, BASE_URL } from '../support/auth.ts';
import { attachCapture, screenshot } from '../support/capture.ts';

const publicScreens = [
  { id: 'login', name: 'login.aspx', url: `${BASE_URL}/Login.aspx` },
  { id: 'nueva-cuenta', name: 'nueva-cuenta', url: `${BASE_URL}/NuevaCuenta.aspx` },
];

const protectedScreens = [
  { id: 'mi-cuenta', name: 'mi-cuenta', url: `${BASE_URL}/MiCuenta.aspx` },
  { id: 'estado-cuenta', name: 'estado-cuenta', url: `${BASE_URL}/Estado.aspx` },
  { id: 'rastreo', name: 'rastreo', url: `${BASE_URL}/Rastreo.aspx` },
  { id: 'prueba-exportacion', name: 'prueba-exportacion', url: `${BASE_URL}/PruebaExportacion.aspx` },
  { id: 'prealerta', name: 'prealerta', url: `${BASE_URL}/PreAlerta.aspx` },
  { id: 'pago-online', name: 'pago-online', url: `${BASE_URL}/PagoOnline.aspx` },
];

const browser = await chromium.launch();
const page = await browser.newPage();
attachCapture(page, 'sitemap-crawl-session');

for (const s of publicScreens) {
  await page.goto(s.url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await screenshot(page, s.id);
  console.log(s.id, '| requested:', s.url, '| final:', page.url());
}

await login(page);

for (const s of protectedScreens) {
  await page.goto(s.url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await screenshot(page, s.id);
  console.log(s.id, '| requested:', s.url, '| final:', page.url());
}

await page.close();
await browser.close();
