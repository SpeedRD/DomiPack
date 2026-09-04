// Phase 4 — Login.aspx: AX-01/AX-05 (axe 1440), CC-01/CC-03 (copy + messages collected in login-fields run), NV-05 (unauth GETs).
import fs from 'fs';
import { startSession, runAxe, logCase, saveEvidence, saveText, serverErrorSignature, BASE_URL } from '../../support/phase4.ts';

const GROUP = 'login';
const SCREEN = 'Login';
const LOGIN = `${BASE_URL}/Login.aspx`;
const OUT = '/private/tmp/claude-501/-Users-ed-Projects-DomiPack/396c8fd0-e57a-4acd-b3d8-15c50440348d/scratchpad';

const s = await startSession({ name: 'p4-login-nav-axe', auth: false });
const page = s.page;

// ---------- AX-01 / AX-05 ----------
await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
const axe = await runAxe(page, 'login-1440');
console.log('AXE', JSON.stringify(axe));
logCase({ group: GROUP, screen: SCREEN, caseId: 'AX-01', instance: 'Login', result: axe.count ? 'fail' : 'pass', findingIds: axe.count ? ['LG-11'] : [], reason: axe.violations.map((v) => `${v.id}(${v.impact},${v.nodes})`).join(', '), evidence: [axe.file] });
{
  const contrast = axe.violations.filter((v) => /contrast/.test(v.id));
  logCase({ group: GROUP, screen: SCREEN, caseId: 'AX-05', instance: 'Login', result: contrast.length ? 'fail' : 'pass', findingIds: contrast.length ? ['LG-11'] : [], reason: contrast.map((v) => `${v.id}: ${v.sample.join(' ; ')}`).join(' | ') || 'no contrast violations from axe', evidence: [axe.file] });
}

// ---------- CC-01 / CC-03 ----------
{
  const out = fs.existsSync(`${OUT}/login-fields.out`) ? fs.readFileSync(`${OUT}/login-fields.out`, 'utf8') : '';
  const attempts = out.split('\n').filter((l) => l.startsWith('ATTEMPT ')).map((l) => { try { return JSON.parse(l.slice(8)); } catch { return null; } }).filter(Boolean);
  const msgs = attempts.map((a: any) => ({ label: a.label, status: a.status, message: (a.message || '').slice(0, 220), swal: (a.swal || '').slice(0, 220), title: a.title }));
  const bodyText = await page.evaluate(`(document.body.innerText || '').replace(/\\s+/g, ' ').trim()`);
  const lang = await page.evaluate(`document.documentElement.lang`);
  const title = await page.title();
  const ev = saveEvidence('login-messages', { title, lang, bodyText, messages: msgs });
  console.log('CC', JSON.stringify({ title, lang, bodyText }));
  logCase({ group: GROUP, screen: SCREEN, caseId: 'CC-01', instance: 'Login copy', result: 'fail', findingIds: ['LG-12'], reason: `lang="${lang}" title="${title}" copy="${bodyText}" (mezcla inglés/español: "Remember me", "Password"; "Recuperar mi Contraseña?" con signo de interrogación; título "Web Trans")`, evidence: [ev] });
  const uniq = [...new Set(msgs.map((m) => (m.swal || m.message).trim()).filter(Boolean))];
  logCase({ group: GROUP, screen: SCREEN, caseId: 'CC-03', instance: 'Login messages', result: 'fail', findingIds: ['LG-04', 'LG-05'], reason: `mensajes: ${JSON.stringify(uniq).slice(0, 500)}`, evidence: [ev] });
}

// ---------- NV-05: unauthenticated direct GETs ----------
{
  const targets = ['MiCuenta.aspx', 'Estado.aspx', 'Rastreo.aspx', 'PruebaExportacion.aspx', 'PreAlerta.aspx', 'PagoOnline.aspx', 'dlg/Adjuntos.aspx'];
  const out: any[] = [];
  const req = await s.browser.newContext();
  for (const t of targets) {
    let r: any;
    try { r = await req.request.get(`${BASE_URL}/${t}`, { maxRedirects: 0 }); } catch (e) { out.push({ url: t, error: String(e) }); continue; }
    const body = await r.text();
    const looksProtectedContent = /cpBody_|gvDatos|mm-active|Estado de Cuenta|Rastreo de|PreAlerta|Pago Online|Mi Cuenta/i.test(body);
    const rec = { url: t, status: r.status(), location: r.headers()['location'], bodyLength: body.length, bodyHead: body.slice(0, 300).replace(/\s+/g, ' '), looksProtectedContent, isLoginPage200: r.status() === 200 && /id="lUser"|Iniciar sesi/.test(body), serverError: serverErrorSignature(body) };
    saveText(`nv05-${t.replace(/[\/.]/g, '_')}-${r.status()}`, `<!-- GET ${BASE_URL}/${t} -> ${r.status()} location=${rec.location} -->\n` + body, 'html');
    out.push(rec);
  }
  await req.close();
  const ev = saveEvidence('login-nv05-unauth', out);
  console.log('NV-05', JSON.stringify(out));
  for (const o of out) {
    const ok = !o.error && ((o.status === 302 && /Login\.aspx/i.test(o.location || '') && !o.looksProtectedContent) || o.isLoginPage200);
    logCase({ group: GROUP, screen: SCREEN, caseId: 'NV-05', instance: o.url, result: ok ? 'pass' : 'fail', findingIds: ok ? [] : ['LG-13'], reason: `status=${o.status} location=${o.location} bodyLen=${o.bodyLength} protectedContentInBody=${o.looksProtectedContent} loginPage200=${o.isLoginPage200} err=${o.serverError || o.error || ''}`, evidence: [ev, `audit/logs/evidence/nv05-${o.url.replace(/[\/.]/g, '_')}-${o.status}.html`] });
  }
  await page.goto(`${BASE_URL}/Rastreo.aspx`, { waitUntil: 'domcontentloaded' });
  console.log('NV-05 browser final url', page.url());
  saveEvidence('login-nv05-browser-final-url', { requested: 'Rastreo.aspx', finalUrl: page.url() });
}

await s.close();
console.log('DONE login-nav-axe');
