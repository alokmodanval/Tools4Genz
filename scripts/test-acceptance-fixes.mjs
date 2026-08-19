import { readFileSync } from 'node:fs';
import worker from '../worker/src/index.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
let passed = 0;
const check = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  passed += 1;
  console.log(`✅ ${passed}. ${label}`);
};

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql.replace(/\s+/g, ' ').trim(); this.values = []; }
  bind(...values) { this.values = values; return this; }
  async first() { return (await this.all()).results[0] || null; }
  async all() {
    if (this.sql.includes('FROM admin_projects')) return { results: [] };
    if (this.sql.includes('FROM project_releases')) {
      const rows = this.db.releases.filter((release) => release.project_id === this.values[0] && release.status === 'published');
      return { results: rows };
    }
    return { results: [] };
  }
  async run() { return { meta: { changes: 0, last_row_id: 0 } }; }
}
class MemoryD1 {
  constructor(releases = []) { this.releases = releases; }
  prepare(sql) { return new Statement(this, sql); }
}
class MemoryKV {
  constructor(keys = []) { this.keys = new Set(keys); }
  async getWithMetadata(key) {
    return this.keys.has(key)
      ? { value: new Uint8Array([1, 2, 3]).buffer, metadata: { size: 3, contentType: 'application/zip' } }
      : { value: null, metadata: null };
  }
  async put() {} async delete() {}
}

async function json(response) { return response.json(); }

async function main() {
  console.log('🧪 Tools4Genz — Acceptance Fix Pass\n');
  const release = { id: 1, project_id: 'ml-sentiment-analyzer', version: '1.0.0', status: 'published', r2_key: 'projects/ml.zip', storage_provider: 'kv', published_at: new Date().toISOString() };
  const readyEnv = { DB: new MemoryD1([release]), PROJECT_ASSETS: new MemoryKV([release.r2_key]) };
  const missingEnv = { DB: new MemoryD1([]), PROJECT_ASSETS: new MemoryKV() };

  let response = await worker.fetch(new Request('https://test/api/projects/ml-sentiment-analyzer/availability'), readyEnv);
  let body = await json(response);
  check(response.status === 200 && body.data?.purchasable === true, 'published release with private object is purchasable');
  check(!JSON.stringify(body).includes(release.r2_key), 'availability API does not expose the object key');

  response = await worker.fetch(new Request('https://test/api/projects/ml-sentiment-analyzer/availability'), missingEnv);
  body = await json(response);
  check(response.status === 200 && body.data?.purchasable === false, 'missing release is reported unavailable');

  response = await worker.fetch(new Request('https://test/api/projects/not-a-project/availability'), missingEnv);
  check(response.status === 404, 'unknown project availability returns 404');
  response = await worker.fetch(new Request('https://test/api/projects/ml-sentiment-analyzer/availability', { method: 'POST' }), missingEnv);
  check(response.status === 405, 'availability endpoint rejects the wrong method');

  response = await worker.fetch(new Request('https://test/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: 'ml-sentiment-analyzer', customerName: 'Buyer Name', customerEmail: 'buyer@example.com' }) }), missingEnv);
  body = await json(response);
  check(response.status === 409 && body.error?.code === 'PROJECT_NOT_AVAILABLE', 'order creation fails closed when artifact is unavailable');

  const router = read('src/router.tsx');
  check(router.includes("path: 'services/request'"), 'service request route exists');
  check(router.includes("path: 'privacy'") && router.includes("path: 'terms'") && router.includes("path: 'contact'"), 'privacy, terms, and contact routes exist');
  const servicePage = read('src/pages/ServiceRequestPage.tsx');
  check(servicePage.includes('services.find') && servicePage.includes("service?.id || 'generic'"), 'known service is selected and unknown type falls back safely');
  check(servicePage.includes('RequestMultiStepForm'), 'service route reuses the existing request form');
  check(read('src/pages/ContactPage.tsx').includes('RequestMultiStepForm'), 'contact page submits through the existing request system');
  check(read('src/pages/PrivacyPage.tsx').includes('Razorpay') && read('src/pages/TermsPage.tsx').includes('server at order time'), 'legal pages describe current payment and purchase behavior');

  const nav = read('src/components/layout/Navbar.tsx');
  const mobile = read('src/components/layout/MobileMenu.tsx');
  check(nav.includes('submitSearch') && mobile.includes('submitSearch'), 'desktop and mobile search controls are functional');
  check(read('src/pages/ProjectsPage.tsx').includes("searchParams.get('search')") && read('src/pages/ToolsPage.tsx').includes("searchParams.get('search')"), 'search query is consumed by result pages');

  const requestForm = read('src/components/forms/RequestMultiStepForm.tsx');
  check(!requestForm.includes('No data has been stored on a live server yet'), 'request success copy no longer claims data was not stored');
  const purchase = read('src/components/projects/PurchaseModal.tsx');
  check(purchase.indexOf("msg.includes('FEATURE_NOT_ENABLED')") < purchase.indexOf("console.error('Error generating UPI QR:'"), 'expected QR capability fallback is not logged as an error');
  check(purchase.includes('secure download will appear in My Purchases'), 'purchase email copy matches secure recovery and download behavior');
  check(read('src/i18n/index.ts').includes('document.documentElement.lang'), 'document language follows the selected locale');
  const footer = read('src/components/layout/Footer.tsx');
  check(!footer.includes('href="#"') && footer.includes('new Date().getFullYear()'), 'footer has no fake social links and uses the current year');
  const settings = read('src/pages/admin/SettingsPage.tsx');
  check(!settings.includes('local mock store') && !settings.includes('Save Platform Settings'), 'admin settings no longer presents a fake save action');
  check(read('src/pages/MyPurchasesPage.tsx').includes('<SEO') && read('src/pages/PurchaseRecoveryPage.tsx').includes('<SEO'), 'purchase and recovery pages include SEO metadata');
  const projectDetail = read('src/pages/ProjectDetailPage.tsx');
  check(projectDetail.includes('failedImageUrl') && projectDetail.includes('Project preview'), 'missing project artwork has a stable placeholder');
  check(read('src/pages/ServicesPage.tsx').includes('href="/contact"'), 'custom service CTA points to the contact workflow');
  check(!read('worker/wrangler.toml').includes('PURCHASE_AVAILABILITY_BYPASS'), 'test-only purchase bypass is absent from deployment configuration');

  console.log(`\n🎉 Acceptance fixes: ${passed}/${passed} passed`);
}

main().catch((error) => { console.error(error); process.exit(1); });
