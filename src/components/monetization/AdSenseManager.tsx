import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { canLoadAdSense } from '@/utils/monetization';

const SCRIPT_SELECTOR = 'script[data-tools4genz-adsense="true"]';

export default function AdSenseManager() {
  const { pathname } = useLocation(); const settings = useSiteSettings();
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
    if (!canLoadAdSense(pathname, settings)) { existing?.remove(); return; }
    if (existing) return;
    const script = document.createElement('script'); script.async = true; script.crossOrigin = 'anonymous';
    script.dataset.tools4genzAdsense = 'true';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(settings.adsense_publisher_id)}`;
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [pathname, settings]);
  return null;
}
