import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITE = 'https://tools4genz.pages.dev';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'tools4genz-chrome-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--no-first-run', '--disable-default-apps', '--disable-background-networking',
  '--disable-component-update', '--disable-extensions', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true });
const chromeExited = new Promise(resolve => chrome.once('exit', resolve));

let passed = 0; let failed = 0; let nextId = 0;
const pending = new Map(); const events = [];
function test(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function devtoolsAddress() {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100; i += 1) {
    try {
      const [port, pathname] = readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
      if (port && pathname) return `ws://127.0.0.1:${port}${pathname}`;
    } catch { /* Chrome is still starting. */ }
    await pause(100);
  }
  throw new Error('Chrome DevTools endpoint did not start');
}

function command(ws, method, params = {}, sessionId) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

async function load(ws, pathname, width) {
  const { targetId } = await command(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await command(ws, 'Target.attachToTarget', { targetId, flatten: true });
  await command(ws, 'Page.enable', {}, sessionId);
  await command(ws, 'Runtime.enable', {}, sessionId);
  await command(ws, 'Log.enable', {}, sessionId);
  await command(ws, 'Emulation.setDeviceMetricsOverride', {
    width, height: width <= 400 ? 844 : 900, deviceScaleFactor: 1, mobile: width <= 400,
  }, sessionId);
  const start = events.length;
  await command(ws, 'Page.navigate', { url: `${SITE}${pathname}` }, sessionId);
  await pause(2400);
  const evaluation = await command(ws, 'Runtime.evaluate', {
    expression: `(() => ({
      href: location.href,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      bodyLength: document.body?.innerText?.trim().length || 0,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      rawKey: /(?:home|tools|projects|services|nav|common)\\.[a-z][a-zA-Z.]+/.test(document.body?.innerText || ''),
      lang: document.documentElement.lang,
      root: Boolean(document.querySelector('#root')),
    }))()`, returnByValue: true,
  }, sessionId);
  const pageEvents = events.slice(start).filter(event => event.sessionId === sessionId);
  const severe = pageEvents.filter(event =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Runtime.consoleAPICalled' && event.params?.type === 'error') ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params?.entry?.level) &&
      !/favicon|third-party cookie/i.test(event.params?.entry?.text || '') &&
      !(event.params?.entry?.networkRequestId && event.params?.entry?.text?.includes('401')))
  );
  await command(ws, 'Target.closeTarget', { targetId });
  return { value: evaluation.result?.value || {}, severe };
}

console.log('\nTools4Genz Phase 16 production browser acceptance\n');
try {
  const ws = new WebSocket(await devtoolsAddress());
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', message => {
    const payload = JSON.parse(String(message.data));
    if (payload.id) {
      const item = pending.get(payload.id); pending.delete(payload.id);
      if (payload.error) item?.reject(new Error(payload.error.message)); else item?.resolve(payload.result || {});
    } else events.push(payload);
  });

  const routes = [
    ['Home', '/'], ['Tools', '/tools'], ['Native tool', '/tools/word-counter'],
    ['Projects', '/projects'], ['Project detail', '/projects/weather-app'], ['Services', '/services'],
    ['Contact', '/contact'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['Login', '/login'],
    ['My Purchases', '/my-purchases'], ['Unknown 404', '/phase16-route-that-does-not-exist'],
  ];
  for (const width of [1366, 390]) {
    for (const [name, route] of routes) {
      const result = await load(ws, route, width);
      const label = `${name} at ${width}px`;
      test(`${label} renders meaningful content`, result.value.root && result.value.bodyLength > 80 && result.value.title);
      test(`${label} has no horizontal overflow`, !result.value.overflow);
      test(`${label} has no breaking console/runtime error`, result.severe.length === 0, result.severe.map(item => item.method).join(', '));
      test(`${label} exposes no raw translation key`, !result.value.rawKey);
    }
  }

  const admin = await load(ws, '/admin/dashboard', 390);
  test('Anonymous Admin dashboard redirects to protected login', admin.value.href.includes('/admin/login'));
  test('Admin login is usable at 390px', admin.value.bodyLength > 80 && !admin.value.overflow);
  test('Admin protected flow has no breaking console/runtime error', admin.severe.length === 0);

  for (const slug of ['word-counter', 'character-counter', 'json-formatter', 'json-minifier', 'case-converter', 'percentage-calculator', 'random-text-generator', 'unit-converter']) {
    const result = await load(ws, `/tools/${slug}`, 768);
    test(`Native tool browser smoke succeeds: ${slug}`, result.value.bodyLength > 100 && result.value.h1 && result.severe.length === 0 && !result.value.overflow);
  }

  const theme = await command(ws, 'Target.createTarget', { url: `${SITE}/tools` });
  const attached = await command(ws, 'Target.attachToTarget', { targetId: theme.targetId, flatten: true });
  await command(ws, 'Runtime.enable', {}, attached.sessionId); await pause(1800);
  const dark = await command(ws, 'Runtime.evaluate', {
    expression: `(() => { document.documentElement.classList.add('dark'); const c=getComputedStyle(document.body); return {dark:document.documentElement.classList.contains('dark'),color:c.color,bg:c.backgroundColor}; })()`,
    returnByValue: true,
  }, attached.sessionId);
  test('Dark theme can render with explicit foreground/background colors', dark.result?.value?.dark && dark.result.value.color !== dark.result.value.bg);
  const hindi = await command(ws, 'Runtime.evaluate', {
    expression: `(() => { const el=document.querySelector('button[aria-label="Language selector"]'); if(el) el.click(); return Boolean(el); })()`,
    returnByValue: true,
  }, attached.sessionId);
  await pause(500);
  const language = await command(ws, 'Runtime.evaluate', { expression: `document.documentElement.lang`, returnByValue: true }, attached.sessionId);
  test('Language control is keyboard-button based and switches document language', hindi.result?.value && language.result?.value === 'hi');
  await command(ws, 'Target.closeTarget', { targetId: theme.targetId });
  ws.close();
} catch (error) {
  test('Browser harness completed', false, error instanceof Error ? error.message : String(error));
} finally {
  chrome.kill();
  await Promise.race([chromeExited, pause(3000)]);
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

console.log(`\nPhase 16 browser acceptance: ${passed}/${passed + failed} tests passed.\n`);
if (failed) process.exit(1);
