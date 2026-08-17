-- ============================================================
-- Tools4Genz — D1 Migration 0004
-- Secure Initial Admin Bootstrap Strategy
--
-- In accordance with production security standards, no default or known
-- passwords/hashes are committed to migration scripts.
--
-- Initial admin account creation is handled securely via:
-- 1. One-time server-side bootstrap endpoint: POST /api/auth/bootstrap
--    (allowed only when admin_users count is 0)
-- 2. Or CLI setup utility: npm run bootstrap:admin
-- ============================================================

-- Safe idempotent no-op placeholder for migration ledger tracking
SELECT 1;

