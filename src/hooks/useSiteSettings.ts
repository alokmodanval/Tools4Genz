import { useEffect, useState } from 'react';
import { defaultSiteSettings, platformService, SiteSettings } from '@/services/platformService';

let cached = defaultSiteSettings;
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(cached);
  useEffect(() => { let active = true; platformService.settings().then((value) => { cached = value; if (active) setSettings(value); }); return () => { active = false; }; }, []);
  return settings;
}
