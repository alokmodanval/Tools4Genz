import { SiteSettings } from '@/services/platformService';

export type AdPlacement = 'tools_listing' | 'tool_content' | 'project_content' | 'services_content';
export const ADSENSE_PUBLISHER_PATTERN = /^ca-pub-\d{16}$/;

export function placementEnabled(pathname: string, settings: SiteSettings) {
  if (pathname === '/tools' || pathname.startsWith('/tools/')) return settings.ads_on_tools === 'true';
  if (pathname === '/projects' || pathname.startsWith('/projects/')) return settings.ads_on_projects === 'true';
  if (pathname === '/services') return settings.ads_on_services === 'true';
  return false;
}

export function canLoadAdSense(pathname: string, settings: SiteSettings) {
  const manualSlot = pathname === '/tools' ? settings.adsense_tools_listing_slot_id
    : pathname.startsWith('/tools/') ? settings.adsense_tool_content_slot_id
      : pathname === '/projects' || pathname.startsWith('/projects/') ? settings.adsense_project_content_slot_id
        : pathname === '/services' ? settings.adsense_services_content_slot_id : '';
  const hasAdMode = settings.auto_ads_enabled === 'true' || /^\d{5,30}$/.test(manualSlot);
  return settings.ads_enabled === 'true'
    && settings.adsense_enabled === 'true'
    && settings.consent_provider_configured === 'true'
    && ADSENSE_PUBLISHER_PATTERN.test(settings.adsense_publisher_id)
    && hasAdMode
    && placementEnabled(pathname, settings);
}

export function slotForPlacement(placement: AdPlacement, settings: SiteSettings) {
  const slots: Record<AdPlacement, string> = {
    tools_listing: settings.adsense_tools_listing_slot_id,
    tool_content: settings.adsense_tool_content_slot_id,
    project_content: settings.adsense_project_content_slot_id,
    services_content: settings.adsense_services_content_slot_id,
  };
  return /^\d{5,30}$/.test(slots[placement]) ? slots[placement] : '';
}
