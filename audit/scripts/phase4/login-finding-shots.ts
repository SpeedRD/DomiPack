// Extra screenshots for findings that were evidenced by data but lacked a dedicated PNG. Unauthenticated, no POSTs.
import { startSession, shot, BASE_URL } from '../../support/phase4.ts';
const s = await startSession({ name: 'p4-login-finding-shots', auth: false });
const page = s.page;
await s.context.route('**/*', (route) => (route.request().method() === 'POST' ? route.abort('blockedbyclient') : route.continue()));

// LG-09: logo link -> index.html 404
await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
await shot(page, 'LG-09', false);
// LG-13: unauthenticated dlg/Adjuntos.aspx -> 500
await page.goto(`${BASE_URL}/dlg/Adjuntos.aspx`, { waitUntil: 'domcontentloaded' });
await shot(page, 'LG-13', false);
// LG-02 / LG-17: login form with values (no reveal toggle; Recuperar link)
await page.goto(`${BASE_URL}/Login.aspx`, { waitUntil: 'domcontentloaded' });
await page.fill('#lUser', 'DP-000000'); await page.fill('#lPass', 'contraseña-de-prueba');
await shot(page, 'LG-02', false);
await page.hover('a[onclick="Recuperar();"]');
await shot(page, 'LG-17', false);

// Nueva Cuenta
const NC = `${BASE_URL}/NuevaCuenta.aspx`;
await page.goto(NC, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
await page.evaluate(`['tbFecha','Email','tbContacto','ltelefono','lcelular','Password'].forEach(function(id){ document.getElementById(id).removeAttribute('disabled'); })`);
await page.fill('#Nombre', 'Prueba Auditoria');
await page.fill('#Email', 'uno@example.com'); await page.fill('#Email1', 'dos@example.com');
await page.fill('#ltelefono', 'abc'); await page.fill('#lcelular', '+++()1');
await page.fill('#Password', '     ');
await page.evaluate(`(() => { var e = document.getElementById('tbFecha'); e.value = '2035-01-01'; })()`);
const valid = await page.evaluate(`document.forms[0].checkValidity()`);
console.log('form valid with mismatched emails / letters in phones / whitespace password / future DOB:', valid);
await shot(page, 'NC-06', false);
await page.locator('#ltelefono').scrollIntoViewIfNeeded();
await shot(page, 'NC-07', false);
await page.locator('#Password').scrollIntoViewIfNeeded();
await shot(page, 'NC-08', false);
await page.locator('#tbFecha').scrollIntoViewIfNeeded();
await shot(page, 'NC-09', false);
await page.locator('#sSexo').scrollIntoViewIfNeeded();
await shot(page, 'NC-10', false);
await s.close();
console.log('DONE shots');
