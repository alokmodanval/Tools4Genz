import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { AdPlacement, canLoadAdSense, slotForPlacement } from '@/utils/monetization';

declare global { interface Window { adsbygoogle?: unknown[] } }

export default function AdSlot({ placement }: { placement: AdPlacement }) {
  const settings = useSiteSettings(); const { pathname } = useLocation(); const initialized = useRef(false);
  const enabled = canLoadAdSense(pathname, settings); const slot = slotForPlacement(placement, settings);
  useEffect(() => {
    if (!enabled || !slot || initialized.current) return;
    initialized.current = true; try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* provider may still be loading */ }
  }, [enabled, slot]);
  if (import.meta.env.DEV && import.meta.env.VITE_AD_PREVIEW === 'true' && !enabled) {
    return <aside className="my-12 flex min-h-28 items-center justify-center rounded-2xl border-2 border-dashed border-surface-300 bg-surface-100 text-sm font-bold text-surface-500 dark:border-surface-700 dark:bg-surface-900" aria-label={`Ad placement preview: ${placement}`}>Ad placement preview</aside>;
  }
  if (!enabled || !slot) return null;
  return <aside className="my-12 min-h-24 overflow-hidden border-y border-surface-200 py-8 dark:border-surface-800" aria-label="Advertisement">
    <ins className="adsbygoogle block" data-ad-client={settings.adsense_publisher_id} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
  </aside>;
}
