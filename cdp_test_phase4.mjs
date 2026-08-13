// Phase 4 Browser Test - Node.js CDP Client
// Uses Node's built-in WebSocket (v22+) to talk to headless Chrome DevTools Protocol.

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const BASE_URL = 'http://localhost:4175';
const CHROME_PORT = 9223;
const SCRATCH_DIR = 'C:/Users/alok/.gemini/antigravity-ide/brain/63051a34-1dfb-44fb-88de-89acd14dd445/scratch';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
  console.log('=== Phase 4 Browser Validation (Node CDP) ===');

  // 1. Launch headless Chrome
  const chromePaths = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  ];
  const chromePath = chromePaths.find(p => existsSync(p));
  if (!chromePath) throw new Error('Chrome not found');

  console.log(`Launching Chrome: ${chromePath}`);
  const userDataDir = join(process.cwd(), '.chrome-test-profile');
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${CHROME_PORT}`,
    '--remote-allow-origins=*',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,800',
    'about:blank',
  ], { stdio: 'ignore' });

  // Wait for CDP endpoint
  let target = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${CHROME_PORT}/json/new?about:blank`, { method: 'PUT' });
      target = await res.json();
      break;
    } catch {
      await sleep(500);
    }
  }
  if (!target) throw new Error('Failed to connect to Chrome CDP');

  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.open();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  // Inject error capture + React input setter helper
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
    window.__setSelect = function(sel, value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    };
  `;
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: injectScript });

  const evaluate = async (expression) => {
    const res = await client.send('Runtime.evaluate', { expression, returnByValue: true });
    return res?.result?.value;
  };

  const waitForLoad = async (timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const ready = await evaluate("document.readyState === 'complete'");
      if (ready) { await sleep(1000); return true; }
      await sleep(200);
    }
    return false;
  };

  const navigate = async (path) => {
    await client.send('Page.navigate', { url: `${BASE_URL}${path}` });
    await waitForLoad();
    await sleep(300);
  };

  const verifyPage = async (routeName, path) => {
    console.log(`\n--- Route: ${routeName} (${path}) ---`);
    await navigate(path);
    const errors = await evaluate('window.__browserErrors'); 
    const bodyText = await evaluate('document.body.innerText');
    const isBlank = !bodyText || bodyText.trim().length === 0;
    const exceptions = (errors || []).filter(e => e.type === 'exception');
    results[routeName] = { loaded: true, is_blank: isBlank, exception_count: exceptions.length };
    console.log(`  Blank: ${isBlank}, Exceptions: ${exceptions.length}`);
    return !isBlank && exceptions.length === 0;
  };

  // ===== ROUTE REGRESSION =====
  const routes = [
    ['home', '/'],
    ['tools', '/tools'],
    ['tool_detail', '/tools/word-counter'],
    ['projects', '/projects'],
    ['project_detail', '/projects/ecommerce-platform'],
    ['services', '/services'],
    ['students', '/students'],
    ['clients', '/clients'],
    ['about', '/about'],
    ['not_found', '/non-existent-page'],
  ];
  for (const [name, path] of routes) {
    const passed = await verifyPage(name, path);
    results[name].passed = passed;
  }

  // ===== STUDENT MULTI-STEP FORM =====
  console.log('\n=== Student Multi-Step Form ===');
  await navigate('/students');

  // Blank submit -> validation errors
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next') || x.textContent.includes('आगे')); if (b) b.click(); return true; })()`);
  await sleep(500);
  const blankText = await evaluate('document.body.innerText');
  const blankHasErrors = /required|आवश्यक/i.test(blankText);
  results.student_blank_validation = blankHasErrors;
  console.log(`  Blank submit shows validation errors: ${blankHasErrors}`);

  // Invalid phone
  await evaluate(`(() => {
    const name = document.querySelector('input[name="name"]');
    const email = document.querySelector('input[name="email"]');
    const phone = document.querySelector('input[name="phone"]');
    if (name) window.__setVal(name, 'Rahul Sharma');
    if (email) window.__setVal(email, 'rahul@example.com');
    if (phone) window.__setVal(phone, '12');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next') || x.textContent.includes('आगे'));
    if (b) b.click();
    return true;
  })()`);
  await sleep(500);
  const invalidPhoneText = await evaluate('document.body.innerText');
  const invalidPhoneShown = /invalid phone|अमान्य फोन/i.test(invalidPhoneText);
  results.student_invalid_phone = invalidPhoneShown;
  console.log(`  Invalid phone error shown: ${invalidPhoneShown}`);

  // Invalid email
  await evaluate(`(() => {
    const email = document.querySelector('input[name="email"]');
    if (email) window.__setVal(email, 'invalid-email');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next') || x.textContent.includes('आगे'));
    if (b) b.click();
    return true;
  })()`);
  await sleep(500);
  const invalidText = await evaluate('document.body.innerText');
  const invalidEmailShown = /invalid email|अमान्य ईमेल/i.test(invalidText);
  results.student_invalid_email = invalidEmailShown;
  console.log(`  Invalid email error shown: ${invalidEmailShown}`);

  // Fix email + phone -> step 2
  await evaluate(`(() => {
    const email = document.querySelector('input[name="email"]');
    const phone = document.querySelector('input[name="phone"]');
    if (email) window.__setVal(email, 'rahul@example.com');
    if (phone) window.__setVal(phone, '+91 98765 43210');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next') || x.textContent.includes('आगे'));
    if (b) b.click();
    return true;
  })()`);
  await sleep(500);
  const step2 = await evaluate(`document.body.innerText.includes('Project Description') || document.body.innerText.includes('प्रोजेक्ट विवरण')`);
  results.student_step2 = step2;
  console.log(`  Step 2 reached: ${step2}`);

  // Fill description -> step 3
  await evaluate(`(() => {
    const d = document.querySelector('textarea[name="description"]');
    if (d) window.__setVal(d, 'This is a complete mock student project request for automated testing.');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next') || x.textContent.includes('आगे'));
    if (b) b.click();
    return true;
  })()`);
  await sleep(500);
  const step3 = await evaluate(`document.body.innerText.includes('Budget') || document.body.innerText.includes('बजट')`);
  results.student_step3 = step3;
  console.log(`  Step 3 reached: ${step3}`);

  // Next -> step 4 review
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next') || x.textContent.includes('आगे')); if (b) b.click(); return true; })()`);
  await sleep(500);
  const step4 = await evaluate(`document.body.innerText.includes('Review Your Request') || document.body.innerText.includes('अपने अनुरोध की समीक्षा')`);
  results.student_step4 = step4;
  console.log(`  Step 4 (Review) reached: ${step4}`);

  // Submit -> success
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Submit') || x.textContent.includes('सबमिट')); if (b) b.click(); return true; })()`);
  await sleep(1500);
  const successText = await evaluate('document.body.innerText');
  const hasRef = successText.includes('TG-REQ-');
  const hasSuccessTitle = successText.includes('Your Request Has Been Generated') || successText.includes('आपका अनुरोध तैयार');
  const hasNoServerClaim = successText.includes('No data has been stored on a live server') || successText.includes('किसी भी डेटा को लाइव सर्वर पर संग्रहीत');
  results.student_success = { has_reference_id: hasRef, has_success_title: hasSuccessTitle, wording_accurate: hasNoServerClaim };
  console.log(`  Success - Reference ID: ${hasRef}, Title: ${hasSuccessTitle}, Accurate wording: ${hasNoServerClaim}`);

  // Reset
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Another') || x.textContent.includes('एक और')); if (b) b.click(); return true; })()`);
  await sleep(500);
  const resetText = await evaluate('document.body.innerText');
  const resetOk = resetText.includes('Step 1: Contact') || resetText.includes('चरण 1: संपर्क');
  results.student_reset = resetOk;
  console.log(`  Reset back to step 1: ${resetOk}`);

  // ===== CLIENT MULTI-STEP FORM =====
  console.log('\n=== Client Multi-Step Form ===');
  await navigate('/clients');

  await evaluate(`(() => {
    const name = document.querySelector('input[name="name"]');
    const email = document.querySelector('input[name="email"]');
    const company = document.querySelector('input[name="company"]');
    if (name) window.__setVal(name, 'Acme Corp');
    if (email) window.__setVal(email, 'contact@acme.com');
    if (company) window.__setVal(company, 'Acme Tech Solutions');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next') || x.textContent.includes('आगे'));
    if (b) b.click();
    return true;
  })()`);
  await sleep(500);

  await evaluate(`(() => {
    const d = document.querySelector('textarea[name="description"]');
    if (d) window.__setVal(d, 'We need a complete e-commerce platform with payment gateway and admin dashboard for our business.');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next') || x.textContent.includes('आगे'));
    if (b) b.click();
    return true;
  })()`);
  await sleep(500);

  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next') || x.textContent.includes('आगे')); if (b) b.click(); return true; })()`);
  await sleep(500);

  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Submit') || x.textContent.includes('सबमिट')); if (b) b.click(); return true; })()`);
  await sleep(1500);

  const clientSuccess = await evaluate('document.body.innerText');
  results.client_success = clientSuccess.includes('TG-REQ-');
  console.log(`  Client success - Reference ID: ${results.client_success}`);

  // ===== LANGUAGE SWITCHING & PERSISTENCE =====
  console.log('\n=== Language Switching & Persistence ===');
  await navigate('/students');
  const hasLangBtn = await evaluate(`!!document.querySelector('button[aria-label="Language selector"]')`);
  if (hasLangBtn) {
    await evaluate(`document.querySelector('button[aria-label="Language selector"]')?.click()`);
    await sleep(800);
    const langVal = await evaluate(`localStorage.getItem('i18nextLng')`);
    const hindiNav = await evaluate(`document.querySelector('nav')?.innerText || ''`);
    const hindiForm = await evaluate(`document.body.innerText`);
    const toHindi = (hindiNav.includes('होम') || (langVal && langVal.includes('hi')));
    const hindiFormFields = hindiForm.includes('पूरा नाम') || hindiForm.includes('चरण 1');
    results.language_switching = { to_hindi: toHindi, hindi_form_fields: hindiFormFields };

    await client.send('Page.reload');
    await waitForLoad();
    const persistLang = await evaluate(`localStorage.getItem('i18nextLng')`);
    const persistBody = await evaluate('document.body.innerText');
    results.language_switching.persists_after_reload = (persistLang && persistLang.includes('hi')) || persistBody.includes('पूरा नाम');
    console.log(`  Hindi toggle: ${toHindi}, Hindi form: ${hindiFormFields}, Persists: ${results.language_switching.persists_after_reload}`);

    // back to English
    await evaluate(`document.querySelector('button[aria-label="Language selector"]')?.click()`);
    await sleep(800);
  } else {
    results.language_switching = { error: 'Language button not found' };
  }

  // ===== THEME SWITCHING =====
  console.log('\n=== Theme Switching ===');
  const darkInitial = await evaluate(`document.documentElement.classList.contains('dark')`);
  await evaluate(`document.querySelector('button[aria-label="Toggle dark mode"]')?.click()`);
  await sleep(400);
  const darkAfter = await evaluate(`document.documentElement.classList.contains('dark')`);
  await evaluate(`document.querySelector('button[aria-label="Toggle dark mode"]')?.click()`);
  await sleep(400);
  const darkFinal = await evaluate(`document.documentElement.classList.contains('dark')`);
  results.theme_switching = { initial_dark: darkInitial, toggled_dark: darkAfter, restored_light: !darkFinal };
  console.log(`  Initial: ${darkInitial}, Toggled: ${darkAfter}, Restored: ${!darkFinal}`);

  // ===== MOBILE RESPONSIVENESS =====
  console.log('\n=== Mobile Responsiveness ===');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await sleep(400);
  await navigate('/students');
  const scrollW = await evaluate('document.documentElement.scrollWidth');
  const noHScroll = scrollW <= 375;
  console.log(`  Scroll width: ${scrollW}, No horizontal scroll: ${noHScroll}`);

  // Mobile multi-step nav
  await evaluate(`(() => {
    const name = document.querySelector('input[name="name"]');
    const email = document.querySelector('input[name="email"]');
    if (name) window.__setVal(name, 'Mobile Test');
    if (email) window.__setVal(email, 'mobile@test.com');
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('Next') || x.textContent.includes('आगे'));
    if (b) { b.click(); return true; }
    return false;
  })()`);
  await sleep(500);
  const mobileStep2 = await evaluate(`document.body.innerText.includes('Project Description') || document.body.innerText.includes('प्रोजेक्ट विवरण')`);
  results.mobile_responsiveness = { no_horizontal_scroll: noHScroll, step_navigation_works: mobileStep2 };
  console.log(`  Mobile step navigation: ${mobileStep2}`);

  await client.send('Emulation.clearDeviceMetricsOverride');
  await sleep(300);

  // ===== CONSOLE ERRORS =====
  const finalErrors = await evaluate('window.__browserErrors') || [];
  const exceptions = finalErrors.filter(e => e.type === 'exception');
  const consoleErrors = finalErrors.filter(e => e.type === 'console_error');
  results.console_errors = { exceptions, consoleErrors, clean: exceptions.length === 0 && consoleErrors.length === 0 };
  console.log(`\n=== Console Check ===`);
  console.log(`  Exceptions: ${exceptions.length}, Console errors: ${consoleErrors.length}`);
  if (exceptions.length) console.log(JSON.stringify(exceptions, null, 2));
  if (consoleErrors.length) console.log(JSON.stringify(consoleErrors, null, 2));

  // Summary
  mkdirSync(dirname(join(SCRATCH_DIR, 'phase4_browser_test_results.json')), { recursive: true });
  writeFileSync(join(SCRATCH_DIR, 'phase4_browser_test_results.json'), JSON.stringify(results, null, 2));
  console.log(`\n=== Results written to ${join(SCRATCH_DIR, 'phase4_browser_test_results.json')} ===`);
  console.log(JSON.stringify(results, null, 2));

  client.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});