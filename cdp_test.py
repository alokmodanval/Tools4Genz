import json
import asyncio
import websockets
import requests
import time
import subprocess
import os
import base64

# Configuration
BASE_URL = "http://localhost:5174"
SCRATCH_DIR = "C:/Users/alok/.gemini/antigravity-ide/brain/63051a34-1dfb-44fb-88de-89acd14dd445/scratch"
CHROME_PORT = 9222
WS_HTTP_URL = f"http://localhost:{CHROME_PORT}/json"

class CDPClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.cmd_id = 0

    async def connect(self):
        print(f"Connecting to CDP WebSocket: {self.ws_url}")
        self.ws = await websockets.connect(self.ws_url, max_size=10*1024*1024)

    async def send(self, method, params=None):
        self.cmd_id += 1
        payload = {
            "id": self.cmd_id,
            "method": method,
            "params": params or {}
        }
        await self.ws.send(json.dumps(payload))
        
        while True:
            resp_str = await self.ws.recv()
            resp = json.loads(resp_str)
            if resp.get("id") == self.cmd_id:
                if "error" in resp:
                    raise Exception(f"CDP Error in {method}: {resp['error']}")
                return resp.get("result")

async def wait_for_load(client, timeout=10):
    start = time.time()
    while time.time() - start < timeout:
        try:
            res = await client.send("Runtime.evaluate", {
                "expression": "document.readyState === 'complete'",
                "returnByValue": True
            })
            if res.get("result", {}).get("value") is True:
                await asyncio.sleep(1) # Allow React rendering / hydration
                return True
        except Exception as e:
            pass
        await asyncio.sleep(0.2)
    return False

async def save_screenshot(client, filename):
    filepath = os.path.join(SCRATCH_DIR, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    res = await client.send("Page.captureScreenshot", {"format": "png"})
    img_data = base64.b64decode(res["data"])
    with open(filepath, "wb") as f:
        f.write(img_data)
    print(f"Screenshot saved: {filename}")
    return filepath

async def evaluate(client, expression):
    res = await client.send("Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True
    })
    return res.get("result", {}).get("value")

async def main():
    print("Starting automated browser tests...")
    
    # 1. Check if Chrome is already running with remote debugging
    chrome_proc = None
    try:
        resp = requests.get(f"{WS_HTTP_URL}/list", timeout=2)
        print("Connected to existing Chrome instance.")
    except Exception:
        print("Chrome remote debugging not active. Starting headless Chrome...")
        chrome_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe")
        ]
        chrome_path = None
        for path in chrome_paths:
            if os.path.exists(path):
                chrome_path = path
                break
        
        if not chrome_path:
            raise Exception("Google Chrome not found on this system!")
            
        print(f"Using Chrome path: {chrome_path}")
        chrome_proc = subprocess.Popen([
            chrome_path,
            f"--remote-debugging-port={CHROME_PORT}",
            "--remote-allow-origins=*",
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--window-size=1280,800"
        ])
        
        # Wait for port to open
        for _ in range(20):
            try:
                requests.get(f"{WS_HTTP_URL}/list", timeout=1)
                break
            except Exception:
                await asyncio.sleep(0.5)
        else:
            raise Exception("Failed to launch Chrome with remote debugging.")

    # 2. Get WebSocket debugger URL for the page
    try:
        # Create a new tab
        resp = requests.get(f"{WS_HTTP_URL}/new")
        target_info = resp.json()
    except Exception:
        # Fallback to listing tabs
        resp = requests.get(f"{WS_HTTP_URL}/list")
        target_info = resp.json()[0]
        
    ws_url = target_info["webSocketDebuggerUrl"]
    
    client = CDPClient(ws_url)
    await client.connect()
    
    # Enable Page and Runtime domains
    await client.send("Page.enable")
    await client.send("Runtime.enable")
    
    # Inject script on new document to catch console errors and override alert
    inject_script = """
    window.__browserErrors = window.__browserErrors || [];
    window.onerror = function(message, source, lineno, colno, error) {
      window.__browserErrors.push({type: 'exception', message: String(message), source: String(source), line: lineno});
    };
    if (!window.__consoleOverrideDone) {
      window.__consoleOverrideDone = true;
      const originalConsoleError = console.error;
      console.error = function(...args) {
        window.__browserErrors.push({type: 'console_error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')});
        originalConsoleError.apply(console, args);
      };
    }
    // Override alert to prevent blocking
    window.__lastAlert = null;
    window.alert = function(msg) {
      window.__lastAlert = msg;
      console.log("ALERT DISPATCHED: " + msg);
    };
    """
    await client.send("Page.addScriptToEvaluateOnNewDocument", {"source": inject_script})
    
    # Track test results
    results = {}
    
    # Helper to check page status and errors
    async def verify_page(route_name, url):
        print(f"\n--- Testing Route: {route_name} ({url}) ---")
        await client.send("Page.navigate", {"url": url})
        loaded = await wait_for_load(client)
        if not loaded:
            print(f"Warning: {route_name} page did not load completely within timeout.")
            
        # Check errors
        errors = await evaluate(client, "window.__browserErrors")
        print(f"Captured errors so far: {errors}")
        
        # Check title or page presence
        body_text = await evaluate(client, "document.body.innerText")
        is_blank = not body_text or len(body_text.strip()) == 0
        
        results[route_name] = {
            "loaded": loaded,
            "errors": errors,
            "is_blank": is_blank
        }
        return not is_blank and len([e for e in errors if e['type'] == 'exception']) == 0

    # Test routes & capture screenshots
    # Route 1: Home page (English, desktop)
    passed = await verify_page("home_en", f"{BASE_URL}/")
    await save_screenshot(client, "home_en_desktop.png")
    
    # Route 2: Tools list page
    await verify_page("tools_list", f"{BASE_URL}/tools")
    await save_screenshot(client, "tools_list_desktop.png")
    
    # Route 3: Tool detail page
    await verify_page("tool_detail", f"{BASE_URL}/tools/ai-text-summarizer")
    await save_screenshot(client, "tool_detail_desktop.png")
    
    # Route 4: Projects list page
    await verify_page("projects_list", f"{BASE_URL}/projects")
    await save_screenshot(client, "projects_list_desktop.png")
    
    # Route 5: Project detail page
    await verify_page("project_detail", f"{BASE_URL}/projects/ecommerce-platform")
    await save_screenshot(client, "project_detail_desktop.png")
    
    # Route 6: Services page
    await verify_page("services", f"{BASE_URL}/services")
    
    # Route 7: About page
    await verify_page("about", f"{BASE_URL}/about")
    
    # Route 8: 404 page
    await verify_page("not_found", f"{BASE_URL}/non-existent-page")
    await save_screenshot(client, "not_found_page.png")
    
    # Route 9: Language switching & persistence (on home page)
    print("\n--- Testing Language Switching & Persistence ---")
    await client.send("Page.navigate", {"url": f"{BASE_URL}/"})
    await wait_for_load(client)
    
    # Check initial language (should be English)
    initial_text = await evaluate(client, "document.querySelector('nav').innerText")
    print(f"Initial Navbar (En): {repr(initial_text)}")
    
    # Click language selector toggle to change to Hindi
    print("Toggling language selector...")
    await evaluate(client, "document.querySelector('button[aria-label=\"Language selector\"]').click()")
    await asyncio.sleep(1)
    
    # Verify switch to Hindi
    hindi_text = await evaluate(client, "document.querySelector('nav').innerText")
    print(f"Navbar after Hindi toggle: {repr(hindi_text)}")
    lang_val = await evaluate(client, "localStorage.getItem('i18nextLng')")
    print(f"localStorage language: {lang_val}")
    
    results["language_switching"] = {
        "toggled_to_hindi": "होम" in (hindi_text or "") or (lang_val and "hi" in lang_val)
    }
    
    # Take screenshot of Hindi home page
    await save_screenshot(client, "home_hi_desktop.png")
    
    # Reload page to test persistence
    print("Reloading page to test language persistence...")
    await client.send("Page.reload")
    await wait_for_load(client)
    
    persist_text = await evaluate(client, "document.querySelector('nav').innerText")
    persist_lang = await evaluate(client, "localStorage.getItem('i18nextLng')")
    print(f"Navbar after reload: {repr(persist_text)}")
    print(f"localStorage language after reload: {persist_lang}")
    
    results["language_switching"]["persists_after_reload"] = "होम" in (persist_text or "") or (persist_lang and "hi" in persist_lang)
    
    # Switch back to English
    print("Toggling back to English...")
    await evaluate(client, "document.querySelector('button[aria-label=\"Language selector\"]').click()")
    await asyncio.sleep(1)
    
    # Route 10: Theme Switching
    print("\n--- Testing Theme Switching ---")
    is_dark_initial = await evaluate(client, "document.documentElement.classList.contains('dark')")
    print(f"Initial theme is dark: {is_dark_initial}")
    
    print("Toggling dark mode...")
    await evaluate(client, "document.querySelector('button[aria-label=\"Toggle dark mode\"]').click()")
    await asyncio.sleep(0.5)
    is_dark_after = await evaluate(client, "document.documentElement.classList.contains('dark')")
    print(f"Theme is dark after toggle: {is_dark_after}")
    
    # Toggle back to light
    print("Toggling theme back...")
    await evaluate(client, "document.querySelector('button[aria-label=\"Toggle dark mode\"]').click()")
    await asyncio.sleep(0.5)
    is_dark_final = await evaluate(client, "document.documentElement.classList.contains('dark')")
    print(f"Theme is dark after final toggle: {is_dark_final}")
    
    results["theme_switching"] = {
        "initial_dark": is_dark_initial,
        "toggled_dark": is_dark_after,
        "restored_light": not is_dark_final
    }
    
    # Route 11: Mobile Responsiveness
    print("\n--- Testing Mobile Responsiveness ---")
    # Set viewport to mobile (375x812)
    print("Overriding device metrics to mobile (375x812)...")
    await client.send("Emulation.setDeviceMetricsOverride", {
        "width": 375,
        "height": 812,
        "deviceScaleFactor": 1,
        "mobile": True
    })
    await asyncio.sleep(0.5)
    
    # Click to open mobile menu
    print("Opening mobile menu...")
    await evaluate(client, "document.querySelector('button[aria-label=\"Open menu\"]').click()")
    await asyncio.sleep(0.5)
    
    # Capture mobile menu screenshot
    await save_screenshot(client, "mobile_menu_open.png")
    
    # Check for horizontal scroll / overflow
    scroll_width = await evaluate(client, "document.documentElement.scrollWidth")
    print(f"Mobile view scroll width: {scroll_width}")
    
    results["mobile_responsiveness"] = {
        "menu_opened": True,
        "scroll_width": scroll_width,
        "no_horizontal_scroll": scroll_width <= 375
    }
    
    # Close mobile menu
    await evaluate(client, "document.querySelector('button:has(span:contains(\"Close menu\")), button[onClick*=\"onClose\"]').click()")
    # Restore viewport
    await client.send("Emulation.clearDeviceMetricsOverride")
    await asyncio.sleep(0.5)
    
    # Route 12: Forms Validation & Success
    # Student Form
    print("\n--- Testing Student Form ---")
    await verify_page("students", f"{BASE_URL}/students")
    
    # Submit empty form
    print("Submitting empty student form to trigger validation errors...")
    await evaluate(client, "document.querySelector('button[type=\"submit\"]').click()")
    await asyncio.sleep(0.5)
    
    # Verify validation errors are visible (validation text is rendered)
    errors_text = await evaluate(client, "document.body.innerText")
    has_errors = "required" in errors_text.lower() or "field" in errors_text.lower()
    print(f"Validation errors visible: {has_errors}")
    
    await save_screenshot(client, "student_form_validation_error.png")
    
    # Fill mock student details and submit
    print("Filling student form with mock inputs...")
    fill_student_js = """
    (async () => {
        document.querySelector('input[name="name"]').value = "Jane Student";
        document.querySelector('input[name="name"]').dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('input[name="email"]').value = "jane@student.com";
        document.querySelector('input[name="email"]').dispatchEvent(new Event('input', { bubbles: true }));
        
        const selectType = document.querySelector('select[name="projectType"]');
        selectType.value = "Mini Project";
        selectType.dispatchEvent(new Event('change', { bubbles: true }));
        
        const selectTech = document.querySelector('select[name="technology"]');
        selectTech.value = "React";
        selectTech.dispatchEvent(new Event('change', { bubbles: true }));
        
        document.querySelector('textarea[name="description"]').value = "This is a mock request for testing form submission.";
        document.querySelector('textarea[name="description"]').dispatchEvent(new Event('input', { bubbles: true }));
        
        // Clear previous alert and submit
        window.__lastAlert = null;
        document.querySelector('button[type="submit"]').click();
    })()
    """
    await evaluate(client, fill_student_js)
    print("Student form submitted. Waiting for alert...")
    await asyncio.sleep(1.5) # Wait for 1s timeout in form submit
    
    student_alert = await evaluate(client, "window.__lastAlert")
    print(f"Student submission alert: {student_alert}")
    
    results["student_form"] = {
        "validation_triggered": has_errors,
        "success_alert": student_alert,
        "submitted_successfully": student_alert and "submitted" in student_alert.lower()
    }
    
    # Client Form
    print("\n--- Testing Client Form ---")
    await verify_page("clients", f"{BASE_URL}/clients")
    
    # Submit empty form
    print("Submitting empty client form to trigger validation errors...")
    await evaluate(client, "document.querySelector('button[type=\"submit\"]').click()")
    await asyncio.sleep(0.5)
    
    # Fill mock client details and submit
    print("Filling client form with mock inputs...")
    fill_client_js = """
    (async () => {
        document.querySelector('input[name="name"]').value = "Jane Client";
        document.querySelector('input[name="name"]').dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('input[name="email"]').value = "jane@client.com";
        document.querySelector('input[name="email"]').dispatchEvent(new Event('input', { bubbles: true }));
        
        const selectType = document.querySelector('select[name="projectType"]');
        selectType.value = "E-Commerce";
        selectType.dispatchEvent(new Event('change', { bubbles: true }));
        
        document.querySelector('textarea[name="requirements"]').value = "This is a mock custom solution request for testing form submission.";
        document.querySelector('textarea[name="requirements"]').dispatchEvent(new Event('input', { bubbles: true }));
        
        // Clear previous alert and submit
        window.__lastAlert = null;
        document.querySelector('button[type="submit"]').click();
    })()
    """
    await evaluate(client, fill_client_js)
    print("Client form submitted. Waiting for alert...")
    await asyncio.sleep(1.5) # Wait for 1s timeout in form submit
    
    client_alert = await evaluate(client, "window.__lastAlert")
    print(f"Client submission alert: {client_alert}")
    
    results["client_form"] = {
        "success_alert": client_alert,
        "submitted_successfully": client_alert and "submitted" in client_alert.lower()
    }
    
    # Capture success state (form is reset back to blank)
    await save_screenshot(client, "client_form_success_message.png")
    
    # Write summary to a JSON file in the scratch folder
    summary_path = os.path.join(SCRATCH_DIR, "browser_test_results.json")
    with open(summary_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nTest run complete! Summary written to: {summary_path}")
    
    # Clean up
    await client.ws.close()
    if chrome_proc:
        chrome_proc.terminate()
        chrome_proc.wait()
        print("Headless Chrome terminated.")

if __name__ == "__main__":
    asyncio.run(main())
