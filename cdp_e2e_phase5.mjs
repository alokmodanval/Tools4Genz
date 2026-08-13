// Phase 5 E2E Browser Test: Frontend forms → Worker API → D1
// Uses Node's built-in WebSocket client to drive headless Chrome via CDP.

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const FRONTEND_URL = 'http://localhost:4175'; // Vite preview server
const CHROME_PORT = 9224;
const WS_HTTP_URL = `http://localhost:${CHROME_PORT}/json`;
const SCRATCH_DIR = 'C:/Users/alok/.gemini/antigravity-ide/brain/63051a34-1dfb-44fb-88de-89acd14dd445/scratch';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    console.log('CDP WebSocket connected.');
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

async function main() {
  const results = {};
  console.log('=== Phase 5 E2E Browser Validation ===');

  // Launch Chrome
  const chromePaths = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  ];
  const chromePath = chromePaths.find((p) => existsSync(p));
  if (!chromePath) throw new Error('Chrome not found');
  console.log(`Launching Chrome: ${chromePath}`);
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${CHROME_PORT}`,
    '--remote-allow-origins=*',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,800',
    'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${CHROME_PORT}/json/new?about:blank`, { method: 'PUT' });
      target = await res.json();
      break;
    } catch { await sleep(500); }
  }
  if (!target) throw new Error('Failed to connect to Chrome CDP');

  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.open();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const injectScript = `
    window.__browserErrors = window.__browserErrors || [];
    window.onerror = (message, source, lineno) => {
      window.__browserErrors.push({ type: 'exception', message: String(message), source: String(source), line: lineno });
    };
    if (!window.__consoleOverrideDone) {
      window.__consoleOverrideDone = true;
      const orig = console.error;
      console.error = (...args) => {
        window.__browserErrors.push({ type: 'console_error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') });
        orig(...args);
      };
    }
    window.__setVal = function(el, value) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
  `;
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: injectScript });

  const evaluate = async (expr) => {
    const res = await client.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res?.result?.value;
  };

  const waitForLoad = async (timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const ready = await evaluate("document.readyState === 'complete'");
      if (ready) { await sleep(1500); return true; }
      await sleep(200);
    }
    return false;
  };

  const navigate = async (path) => {
    await client.send('Page.navigate', { url: `${FRONTEND_URL}${path}` });
    await waitForLoad();
    await sleep(300);
  };

  // ===== STUDENT E2E =====
  console.log('\n=== Student E2E via Worker API ===');
  await navigate('/students');

  await evaluate(`(() => {
    const name = document.querySelector('input[name="name"]');
    const email = document.querySelector('input[name="email"]');
    const phone = document.querySelector('input[name="phone"]');
    if (name) window.__setVal(name, 'Alice Student');
    if (email) window.__setVal(email, 'alice@student.dev');
    if (phone) window.__setVal(phone, '+91 98765 43210');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next'));
    if (b) b.click(); return true;
  })()`);
  await sleep(500);

  await evaluate(`(() => {
    const d = document.querySelector('textarea[name="description"]');
    if (d) window.__setVal(d, 'Creating a final year project on machine learning recommendation system for my coursework submission.');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next'));
    if (b) b.click(); return true;
  })()`);
  await sleep(500);

  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next')); if (b) b.click(); return true; })()`);
  await sleep(500);

  await evaluate(`(() => {
    const submitBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Submit') || b.textContent.includes('सबमिट'));
    if (submitBtn) submitBtn.click(); return true;
  })()`);
  await sleep(2500);

  const studentSuccessText = await evaluate('document.body.innerText');
  const studentRefId = (await evaluate("document.body.innerText.match(/TG-REQ-[A-F0-9]{8}/)?.[0]")) || '';
  results.student_e2e = {
    requestId: studentRefId,
    has_reference: !!studentRefId,
    success_title: studentSuccessText.includes('Your Request Has Been Generated'),
    no_mock_wording: !studentSuccessText.includes('mock'),
  };
  console.log(`  Student success - Request ID: ${studentRefId}`);

  // ===== CLIENT E2E =====
  console.log('\n=== Client E2E via Worker API ===');
  await navigate('/clients');

  await evaluate(`(() => {
    const name = document.querySelector('input[name="name"]');
    const email = document.querySelector('input[name="email"]');
    const company = document.querySelector('input[name="company"]');
    if (name) window.__setVal(name, 'Acme Business');
    if (email) window.__setVal(email, 'contact@acme.dev');
    if (company) window.__setVal(company, 'Acme Tech');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next'));
    if (b) b.click(); return true;
  })()`);
  await sleep(500);

  await evaluate(`(() => {
    const d = document.querySelector('textarea[name="description"]');
    if (d) window.__setVal(d, 'Need a complete e-commerce platform with admin dashboard for our retail business operations.');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next'));
    if (b) b.click(); return true;
  })()`);
  await sleep(500);

  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next')); if (b) b.click(); return true; })()`);
  await sleep(500);

  await evaluate(`(() => {
    const submitBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Submit') || b.textContent.includes('सबमिट'));
    if (submitBtn) submitBtn.click(); return true;
  })()`);
  await sleep(2500);

  const clientSuccessText = await evaluate('document.body.innerText');
  const clientRefId = (await evaluate("document.body.innerText.match(/TG-REQ-[A-F0-9]{8}/)?.[0]")) || '';
  results.client_e2e = {
    requestId: clientRefId,
    has_reference: !!clientRefId,
    success_title: clientSuccessText.includes('Your Request Has Been Generated'),
  };
  console.log(`  Client success - Request ID: ${clientRefId}`);

  const errs = await evaluate('window.__browserErrors') || [];
  const exceptions = errs.filter((e) => e.type === 'exception');
  const consoleErrs = errs.filter((e) => e.type === 'console_error');
  results.console = { exceptions: exceptions.length, consoleErrors: consoleErrs.length, clean: exceptions.length === 0 && consoleErrs.length === 0 };
  console.log(`\n  Console: ${exceptions.length} exceptions, ${consoleErrs.length} console errors`);

  mkdirSync(dirname(join(SCRATCH_DIR, 'phase5_e2e_results.json')), { recursive: true });
  writeFileSync(join(SCRATCH_DIR, 'phase5_e2e_results.json'), JSON.stringify(results, null, 2));
  console.log(`\n=== Results: ${join(SCRATCH_DIR, 'phase5_e2e_results.json')} ===`);
  console.log(JSON.stringify(results, null, 2));

  client.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
