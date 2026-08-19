# Tools4Genz search readiness

## Current deployment

- Reachable/indexable origin: `https://tools4genz.pages.dev`
- Dynamic sitemap: `https://tools4genz.pages.dev/sitemap.xml`
- Permanent target: `https://tools4genz.com` (currently NXDOMAIN)

Do not redirect Pages or publish `tools4genz.com` canonicals until the custom
domain resolves over HTTPS.

## Custom-domain activation

1. Add or register `tools4genz.com` in the Cloudflare account and activate its nameservers.
2. Attach `tools4genz.com` to the existing `tools4genz` Pages project.
3. Attach `www.tools4genz.com` and redirect it to the apex, or serve the same deployment consistently.
4. Set the Pages build variable `VITE_SITE_ORIGIN=https://tools4genz.com`.
5. Change Worker `SITE_ORIGIN` to `https://tools4genz.com`.
6. Change `public/robots.txt` sitemap origin to `https://tools4genz.com/sitemap.xml`.
7. Build and redeploy the existing Pages project and Worker.
8. Verify every indexable route canonicalizes to the same path on the apex domain.
9. Redirect `tools4genz.pages.dev/*` to the matching apex path only after the apex is healthy.

## Google Search Console checklist

After the custom domain is live:

1. Add a Domain property for `tools4genz.com`.
2. Complete the DNS ownership verification in Cloudflare.
3. Submit `https://tools4genz.com/sitemap.xml`.
4. Inspect `/`, `/tools`, one shipped tool, `/projects`, one project, and `/services`.
5. Confirm rendered titles, descriptions, canonicals, and structured data.
6. Request indexing only for important representative URLs; allow sitemap discovery for the rest.
7. Monitor Page Indexing, Core Web Vitals, HTTPS, manual actions, and performance reports.
8. Watch for soft-404 reports from unknown SPA routes and address them if Pages gains a safe route-aware 404 mechanism.

## Known V1 constraints

- The application is client-rendered. Google can render JavaScript, but social and non-JavaScript crawlers initially see generic document metadata.
- Unknown SPA paths return HTTP 200 because of the Pages history fallback. Rendered `noindex` prevents indexing, but the response remains a soft-404 candidate.
- EN and HI share the same URLs. No `hreflang` is emitted. A future multilingual SEO version requires stable paths such as `/en/...` and `/hi/...`.

