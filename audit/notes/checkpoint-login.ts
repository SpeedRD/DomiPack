import { chromium } from 'playwright';
import { login, BASE_URL } from '../support/auth.ts';
import { attachCapture, screenshot } from '../support/capture.ts';

const browser = await chromium.launch();
const page = await browser.newPage();
attachCapture(page, 'checkpoint-login');

await login(page);
await screenshot(page, 'checkpoint-01-post-login');

console.log('URL after login:', page.url());

// Navigate to a protected screen to confirm session persists.
// Landing link/menu discovered on the post-login page will be used here
// once the post-login navigation is inspected.

await page.close();
await browser.close();
