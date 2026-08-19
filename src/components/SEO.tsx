import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalUrl, DEFAULT_OG_IMAGE_PATH, SITE_NAME, SITE_ORIGIN } from '@/config/site';

export interface SEOProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  noindex?: boolean;
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function pageTitle(title: string): string {
  const clean = title.trim();
  if (!clean) return SITE_NAME;
  return clean.toLowerCase().includes(SITE_NAME.toLowerCase()) ? clean : `${clean} | ${SITE_NAME}`;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description = 'Free online tools, practical software projects, and custom digital solutions from Tools4Genz.',
  canonicalPath,
  noindex = false,
  image = DEFAULT_OG_IMAGE_PATH,
  type = 'website',
  jsonLd,
}) => {
  const location = useLocation();
  const path = canonicalPath || location.pathname;
  const canonical = canonicalUrl(path);
  const resolvedTitle = pageTitle(title);
  const queryVariant = Boolean(location.search);
  const robots = noindex || queryVariant ? 'noindex, follow' : 'index, follow';
  const imageUrl = image.startsWith('http') ? image : new URL(image, `${SITE_ORIGIN}/`).toString();

  useEffect(() => {
    document.title = resolvedTitle;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[name="robots"]', 'name', 'robots', robots);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
    setMeta('meta[property="og:title"]', 'property', 'og:title', resolvedTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', resolvedTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    document.head.querySelectorAll('script[data-seo-jsonld]').forEach((node) => node.remove());
    const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
    for (const block of blocks) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoJsonld = 'true';
      script.text = JSON.stringify(block).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }

    return () => {
      document.head.querySelectorAll('script[data-seo-jsonld]').forEach((node) => node.remove());
    };
  }, [canonical, description, imageUrl, jsonLd, resolvedTitle, robots, type]);

  return null;
};

export default SEO;
