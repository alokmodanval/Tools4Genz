# Tools4Genz production runbook

## Fixed infrastructure

- Pages project: `tools4genz`
- Current public origin: `https://tools4genz.pages.dev`
- Worker: `tools4genz-api`
- Worker config: `worker/wrangler.toml`
- D1 database binding: `DB` / `tools4genz-db`
- Private asset binding: `PROJECT_ASSETS`

Do not run a root-directory Worker wizard or create replacement Pages, D1, or KV resources.

## Validate and deploy

```powershell
npm ci
npx tsc -b
npx tsc --project worker/tsconfig.json --noEmit
npm run lint
npm run build
npx wrangler d1 migrations list tools4genz-db --remote --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
npx wrangler pages deploy dist --project-name tools4genz
```

Apply a tested pending migration only with:

```powershell
npx wrangler d1 migrations apply tools4genz-db --remote --config worker/wrangler.toml
```

Health check: `GET https://tools4genz-api.alokmodanwal940.workers.dev/api/health`. A healthy response contains only service status and binding readiness.

## Content operations

- Add or edit runtime tools through Admin → Tools. A new bundled native React implementation still requires a frontend deployment.
- Add project metadata through Admin → Projects.
- Upload a ZIP under the project release editor, verify its version/size/SHA-256, then explicitly publish it. Until a private object is published, purchase remains unavailable.
- Change public contact/site/monetization configuration through Admin → Settings. Secrets never belong there.
- Manage contextual recommendations through Admin → Affiliates. Publish only reviewed HTTPS destinations with an accurate disclosure.

## Provider activation

- Email: verify the Resend sending domain, store `RESEND_API_KEY` as a Worker secret, set non-secret `EMAIL_FROM`, deploy, then test receipt/recovery and customer OTP without exposing codes.
- Custom domain: attach the apex and `www` in Pages/DNS. After both resolve, change Pages/Worker canonical origins, decide the `pages.dev` redirect, deploy, and rerun SEO tests.
- AdSense: use an eligible account holder, obtain approval and the real publisher/slot IDs, configure Google Privacy & Messaging or another suitable certified CMP, then enable the D1 flags. Never test by clicking ads.
- Razorpay: keep TEST mode until the account and business are ready. Dynamic UPI QR requires provider-side activation; do not fabricate a QR.

## Incident basics

1. Disable the affected feature flag or provider secret where possible.
2. Preserve logs and a scoped D1 export without copying secrets into tickets.
3. Rotate exposed credentials and revoke related sessions/tokens.
4. Restore using `docs/production-recovery.md`.
5. Run all security/payment/delivery regressions before redeploying.
