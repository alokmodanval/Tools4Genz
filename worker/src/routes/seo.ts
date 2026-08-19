import { adminToolRepository, D1Database } from '../db/repository';
import { AUTHORITATIVE_PROJECTS } from '../data/projects';

const DEFAULT_SITE_ORIGIN = 'https://tools4genz.pages.dev';
const STATIC_PATHS = [
  '/', '/tools', '/projects', '/services', '/students', '/clients',
  '/contact', '/about', '/privacy', '/terms',
];

// These native routes ship with real frontend implementations. Adding another
// bundled native tool already requires a frontend deployment, so this manifest
// intentionally changes with the bundle rather than with D1.
const BUNDLED_TOOL_SLUGS = [
  'word-counter', 'character-counter', 'json-formatter', 'json-minifier',
  'case-converter', 'percentage-calculator', 'random-text-generator', 'unit-converter',
];
const BUNDLED_TOOL_IDS = new Set(BUNDLED_TOOL_SLUGS);

function isPublicRuntimeTool(row: { id: string; status: string; data: string }): boolean {
  if (row.status !== 'active' && row.status !== 'beta') return false;
  try {
    const data = JSON.parse(row.data) as Record<string, unknown>;
    const config = data.integrationConfig && typeof data.integrationConfig === 'object'
      ? data.integrationConfig as Record<string, unknown>
      : {};
    const integration = typeof data.integration === 'string'
      ? data.integration
      : typeof config.type === 'string' ? config.type : 'native';
    return integration !== 'native' || BUNDLED_TOOL_IDS.has(row.id);
  } catch {
    return false;
  }
}

function safeOrigin(value?: string): string {
  try {
    const url = new URL(value || DEFAULT_SITE_ORIGIN);
    return url.protocol === 'https:' ? url.origin : DEFAULT_SITE_ORIGIN;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

function xmlEscape(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character] || character);
}

export async function handleSitemap(db: D1Database, configuredOrigin?: string): Promise<Response> {
  const origin = safeOrigin(configuredOrigin);
  const rows = await adminToolRepository.getAll(db);
  const runtimeSlugs = rows
    .filter(isPublicRuntimeTool)
    .map((row) => row.slug)
    .filter((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug));

  const paths = new Set(STATIC_PATHS);
  for (const slug of [...BUNDLED_TOOL_SLUGS, ...runtimeSlugs]) paths.add(`/tools/${slug}`);
  for (const project of AUTHORITATIVE_PROJECTS) paths.add(`/projects/${project.slug}`);

  const urls = [...paths]
    .sort((left, right) => left === '/' ? -1 : right === '/' ? 1 : left.localeCompare(right))
    .map((path) => `  <url><loc>${xmlEscape(new URL(path, `${origin}/`).toString())}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
