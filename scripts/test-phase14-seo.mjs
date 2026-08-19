import { readFileSync } from 'node:fs';
import { handleSitemap } from '../worker/src/routes/seo.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
let passed = 0;
let failed = 0;

function test(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`✅ ${passed}. ${name}`);
  } else {
    failed += 1;
    console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const seo = read('src/components/SEO.tsx');
const site = read('src/config/site.ts');
const router = read('src/router.tsx');
const redirects = read('public/_redirects');
const headers = read('public/_headers');
const robots = read('public/robots.txt');
const index = read('index.html');
const toolDetail = read('src/pages/ToolDetailPage.tsx');
const projectDetail = read('src/pages/ProjectDetailPage.tsx');
const notFound = read('src/pages/NotFoundPage.tsx');
const toolsPage = read('src/pages/ToolsPage.tsx');
const projectsPage = read('src/pages/ProjectsPage.tsx');
const homePage = read('src/pages/HomePage.tsx');
const adminLayout = read('src/components/layout/AdminLayout.tsx');
const adminLogin = read('src/pages/admin/LoginPage.tsx');
const projectRegistry = read('src/projects/registry.ts');
const i18n = read('src/i18n/index.ts');
const english = JSON.parse(read('src/i18n/locales/en/translation.json'));

const seoTitles = ['home', 'tools', 'projects', 'services', 'students', 'clients', 'about']
  .map((key) => english.seo[key].title);

class Statement {
  constructor(rows) { this.rows = rows; }
  bind() { return this; }
  async all() { return { results: this.rows }; }
  async first() { return null; }
  async run() { return { meta: { changes: 0, last_row_id: 0 } }; }
}

const rows = [
  { id: 'runtime-live', slug: 'runtime-live', name: 'Runtime Live', category: 'utility-tools', status: 'active', featured: 0, data: JSON.stringify({ integration: 'external-url', integrationConfig: { type: 'external-url', url: 'https://example.com' } }) },
  { id: 'runtime-beta', slug: 'runtime-beta', name: 'Runtime Beta', category: 'utility-tools', status: 'beta', featured: 0, data: JSON.stringify({ integration: 'worker-api', integrationConfig: { type: 'worker-api', endpoint: '/api/tool' } }) },
  { id: 'runtime-draft', slug: 'runtime-draft', name: 'Runtime Draft', category: 'utility-tools', status: 'draft', featured: 0, data: '{}' },
  { id: 'runtime-disabled', slug: 'runtime-disabled', name: 'Runtime Disabled', category: 'utility-tools', status: 'disabled', featured: 0, data: '{}' },
  { id: 'runtime-coming', slug: 'runtime-coming', name: 'Runtime Coming', category: 'utility-tools', status: 'coming-soon', featured: 0, data: '{}' },
  { id: 'unshipped-native', slug: 'unshipped-native', name: 'Unshipped Native', category: 'utility-tools', status: 'active', featured: 0, data: JSON.stringify({ integration: 'native' }) },
];
const db = { prepare: () => new Statement(rows) };
const sitemapResponse = await handleSitemap(db, 'https://tools4genz.pages.dev');
const sitemap = await sitemapResponse.text();
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

console.log('\n🧪 Tools4Genz Phase 14 — SEO & Discoverability\n');

test('Important public route titles are unique', new Set(seoTitles).size === seoTitles.length);
test('Important public routes have non-empty descriptions', ['home', 'tools', 'projects', 'services', 'students', 'clients', 'about'].every((key) => english.seo[key].description.length > 40));
test('Canonical origin is centralized', site.includes('export const SITE_ORIGIN') && site.includes('VITE_SITE_ORIGIN'));
test('Canonical paths preserve individual routes', seo.includes('canonicalPath || location.pathname') && seo.includes('canonicalUrl(path)'));
test('OpenGraph metadata is route-driven', ['og:title', 'og:description', 'og:url', 'og:image'].every((key) => seo.includes(key)));
test('Twitter card metadata is present', seo.includes('twitter:card') && seo.includes('summary_large_image'));
test('Query variants canonicalize to their clean route and use noindex', seo.includes('Boolean(location.search)') && toolsPage.includes('canonicalPath="/tools"') && projectsPage.includes('canonicalPath="/projects"'));
test('Customer login uses noindex', read('src/pages/CustomerLoginPage.tsx').includes('noindex'));
test('My Purchases uses noindex', read('src/pages/MyPurchasesPage.tsx').includes('noindex'));
test('Purchase recovery uses noindex', read('src/pages/PurchaseRecoveryPage.tsx').includes('noindex'));
test('Admin routes use noindex in rendered metadata', adminLayout.includes('noindex') && adminLogin.includes('noindex'));
test('Admin/private routes also have X-Robots-Tag protection', ['/admin/*', '/login', '/my-purchases', '/purchase/recover'].every((path) => headers.includes(path)));
test('Unknown routes render noindex', router.includes("path: '*'") && notFound.includes('noindex'));
test('Tool SEO derives from trusted tool metadata with a natural fallback', toolDetail.includes('tool.seo?.title') && toolDetail.includes('tool.seo?.description') && toolDetail.includes('Free Online Tool'));
test('Runtime tool loading waits for D1 before deciding 404', toolDetail.includes('runtimeResult') && toolDetail.includes('aria-busy="true"'));
test('Project SEO derives from project metadata', projectDetail.includes('project.seo?.title') && projectDetail.includes('project.seo?.description'));
test('Project SEO makes no false availability claim', !projectDetail.match(/Product|InStock|aggregateRating/));
test('robots.txt permits public resources', robots.includes('User-agent: *') && robots.includes('Allow: /'));
test('robots.txt advertises the reachable sitemap', robots.includes('https://tools4genz.pages.dev/sitemap.xml'));
test('Pages sitemap route targets the dynamic Worker sitemap', redirects.includes('/sitemap.xml') && redirects.includes('/api/seo/sitemap.xml'));
test('Sitemap response is XML', sitemapResponse.headers.get('content-type')?.includes('application/xml') && sitemap.startsWith('<?xml'));
test('Sitemap XML has a valid urlset envelope', sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">') && sitemap.trim().endsWith('</urlset>'));
test('Sitemap contains no duplicate URLs', new Set(locations).size === locations.length);
test('Sitemap contains expected public listings', ['/', '/tools', '/projects', '/services', '/students', '/clients', '/contact', '/about', '/privacy', '/terms'].every((path) => locations.includes(`https://tools4genz.pages.dev${path === '/' ? '/' : path}`)));
test('Sitemap contains a shipped native tool', locations.includes('https://tools4genz.pages.dev/tools/word-counter'));
test('Published runtime tool is included', locations.includes('https://tools4genz.pages.dev/tools/runtime-live'));
test('Beta runtime tool is included', locations.includes('https://tools4genz.pages.dev/tools/runtime-beta'));
test('Draft tool is excluded', !sitemap.includes('runtime-draft'));
test('Disabled tool is excluded', !sitemap.includes('runtime-disabled'));
test('Coming-soon tool is excluded', !sitemap.includes('runtime-coming'));
test('Unshipped native tool is excluded', !sitemap.includes('unshipped-native'));
test('Sitemap excludes private, Admin, query, and 404 URLs', !locations.some((url) => /\/admin|\/login|my-purchases|purchase\/recover|\?|404/.test(url)));
test('All catalog project routes are represented', [...projectRegistry.matchAll(/slug: '([^']+)'/g)].map((match) => match[1]).every((slug) => locations.includes(`https://tools4genz.pages.dev/projects/${slug}`)));
test('Structured JSON-LD is emitted as parseable JSON', seo.includes("JSON.stringify(block)") && seo.includes("application/ld+json"));
test('WebSite and truthful Organization structured data are present', homePage.includes("'@type': 'WebSite'") && homePage.includes("'@type': 'Organization'"));
test('No fake reviews or ratings are emitted', ![seo, homePage, toolDetail, projectDetail].some((source) => /aggregateRating|reviewRating|ratingValue/.test(source)));
test('Breadcrumb UI uses crawlable links', toolDetail.includes('<Breadcrumbs') && projectDetail.includes('<Breadcrumbs') && read('src/components/navigation/Breadcrumbs.tsx').includes('<Link'));
test('Breadcrumb JSON-LD matches detail navigation', toolDetail.includes("'@type': 'BreadcrumbList'") && projectDetail.includes("'@type': 'BreadcrumbList'"));
test('Project fallback image remains stable', projectDetail.includes("project.icon || '📦'") && projectDetail.includes('onError'));
test('A branded OpenGraph fallback asset is configured', index.includes('/og-default.svg') && seo.includes('DEFAULT_OG_IMAGE_PATH'));
test('Internal primary navigation remains crawlable', read('src/components/layout/Footer.tsx').includes('<Link') && read('src/components/ui/Button.tsx').includes('const Component = as || Link'));
test('Document language still follows the selected UI language', i18n.includes('document.documentElement.lang'));
test('No hreflang is fabricated without localized routes', !read('index.html').includes('hreflang') && !seo.includes('hreflang'));
test('Canonical defaults to reachable pages.dev while custom domain is NXDOMAIN', site.includes("PREVIEW_ORIGIN = 'https://tools4genz.pages.dev'") && !read('.env.production').includes('VITE_SITE_ORIGIN=https://tools4genz.com'));
test('Brand name is consistent in manifest and page metadata', read('public/site.webmanifest').includes('"name": "Tools4Genz"') && index.includes('Tools4Genz'));
test('Sitemap count is scalable and currently complete', locations.length === 32, `received ${locations.length}`);
test('Tool workspace does not introduce a second H1', !read('src/tools/components/ToolHeader.tsx').includes('<h1'));

console.log(`\n${passed}/${passed + failed} tests passed`);
if (failed) process.exitCode = 1;
