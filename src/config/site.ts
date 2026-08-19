const PREVIEW_ORIGIN = 'https://tools4genz.pages.dev';

function normalizeOrigin(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return PREVIEW_ORIGIN;
    return url.origin;
  } catch {
    return PREVIEW_ORIGIN;
  }
}

/**
 * Canonical origin for the current deployment. Keep this on pages.dev until
 * tools4genz.com resolves, then set VITE_SITE_ORIGIN in the Pages build.
 */
export const SITE_ORIGIN = normalizeOrigin(
  import.meta.env.VITE_SITE_ORIGIN || PREVIEW_ORIGIN
);

export const SITE_NAME = 'Tools4Genz';
export const DEFAULT_OG_IMAGE_PATH = '/og-default.svg';

export function canonicalUrl(pathname: string): string {
  const cleanPath = pathname.split(/[?#]/, 1)[0] || '/';
  const normalizedPath = cleanPath === '/' ? '/' : `/${cleanPath.replace(/^\/+|\/+$/g, '')}`;
  return new URL(normalizedPath, `${SITE_ORIGIN}/`).toString();
}

