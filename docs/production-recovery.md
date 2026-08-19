# Tools4Genz production recovery

This document describes recovery procedure without recording secret values.

## D1 backup and recovery

- Before a risky migration, export the remote database with `npx wrangler d1 export tools4genz-db --remote --config worker/wrangler.toml --output <secure-path>`.
- Store exports in encrypted, access-controlled storage outside the repository. Treat them as sensitive because orders and customer contact records contain personal data.
- Restore into a separate recovery D1 database first, validate migrations and row counts, then deliberately rebind the Worker. Never import over production without a reviewed rollback window.
- Apply numbered migrations in order. Migrations are additive by default; test locally before `npx wrangler d1 migrations apply tools4genz-db --remote --config worker/wrangler.toml`.
- Verify `_cf_KV`/D1 backups and Cloudflare account recovery access periodically according to the Cloudflare plan in use.

## KV project assets

- `PROJECT_ASSETS` is private delivery storage. D1 release metadata is not a backup of ZIP bytes.
- Maintain a separate encrypted source archive for each genuine release, indexed by project ID, version, SHA-256, filename, and publication date.
- Periodically inventory release metadata against KV object existence. Never expose KV keys or create a public namespace.
- Recovery order: restore the private object, verify SHA-256, verify release metadata, then publish through the protected Admin workflow.

## Configuration and secrets

- Keep non-secret deployment configuration in `.env.example` and `worker/wrangler.toml`.
- Record an encrypted inventory of required Worker secrets by name only: Razorpay key secret, webhook secret, and future Resend API key. Do not put their values in documentation, D1, Pages variables, frontend variables, or Git.
- Restore secrets with `npx wrangler secret put <NAME> --config worker/wrangler.toml`, then redeploy and test only the associated integration.
- Rotate a secret after suspected exposure and invalidate affected provider credentials/sessions.

## Data retention

- Analytics is first-party, allowlisted, and stores no raw IP or secret tokens. Review and delete analytics older than the operational retention window (recommended default: 13 months) using a dated, reviewed D1 statement.
- Expired/revoked sessions, used login challenges, expired recovery tokens, and old webhook ledger records should be reviewed on a scheduled operational cadence. Retain order/payment records as required for accounting, fraud prevention, support, and applicable law.
- Never bulk-delete genuine production records without a backup, scoped row-count preview, and explicit approval.
