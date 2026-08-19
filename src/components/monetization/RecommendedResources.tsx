import { useEffect, useState } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { AffiliateOffer, monetizationService } from '@/services/monetizationService';

export default function RecommendedResources({ entityType, entityId }: { entityType: 'tool' | 'project' | 'service'; entityId: string }) {
  const settings = useSiteSettings(); const [offers, setOffers] = useState<AffiliateOffer[]>([]);
  useEffect(() => {
    let active = true; if (settings.affiliate_enabled !== 'true') return () => { active = false; };
    monetizationService.publicOffers(entityType, entityId).then(rows => { if (active) setOffers(rows); }).catch(() => { if (active) setOffers([]); });
    return () => { active = false; };
  }, [entityId, entityType, settings.affiliate_enabled]);
  if (settings.affiliate_enabled !== 'true' || !offers.length) return null;
  return <section className="my-14 rounded-3xl border border-surface-200 bg-white p-7 dark:border-surface-700 dark:bg-surface-900" aria-labelledby={`recommendations-${entityType}-${entityId}`}>
    <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600">Sponsored recommendations</p><h2 id={`recommendations-${entityType}-${entityId}`} className="mt-2 text-2xl font-black">Useful resources</h2><p className="mt-2 text-sm text-surface-500">{settings.affiliate_disclosure_text}</p></div>
    <div className="grid gap-4 md:grid-cols-2">{offers.map(offer => <article key={offer.id} className="rounded-2xl border border-surface-200 p-5 dark:border-surface-700"><span className="text-xs font-bold text-amber-700 dark:text-amber-300">Affiliate link</span><h3 className="mt-2 text-lg font-black">{offer.title}</h3><p className="mt-2 text-sm leading-6 text-surface-600 dark:text-surface-300">{offer.description}</p><a href={offer.destinationUrl} target="_blank" rel="sponsored noopener noreferrer" onClick={() => { void monetizationService.trackClick(offer.id).catch(() => undefined); }} className="mt-4 inline-flex rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700">{offer.ctaText}</a>{offer.disclosureText&&<p className="mt-3 text-xs text-surface-500">{offer.disclosureText}</p>}</article>)}</div>
  </section>;
}
