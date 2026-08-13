const { execSync } = require('child_process');
const fs = require('fs');

console.log("=== Environment Check ===");
console.log("Node version:", process.version);

// Check node modules
const modules = ['puppeteer', 'playwright', 'selenium-webdriver'];
modules.forEach(mod => {
  try {
    require(mod);
    console.log(`Node module '${mod}' is available.`);
  } catch(e) {
    console.log(`Node module '${mod}' is NOT available: ${e.message}`);
  }
});

// Check python modules
try {
  console.log("Checking python version...");
  const pyVersion = execSync('python --version').toString().trim();
  console.log("Python version:", pyVersion);
  
  console.log("Checking python packages...");
  const pyPackages = execSync('pip list').toString();
  console.log("Python packages:\n", pyPackages);
} catch(e) {
  console.log("Python check failed:", e.message);
}
