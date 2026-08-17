/**
 * Tools4Genz — Secure Admin Bootstrap Helper Utility
 *
 * This utility uses the Web Crypto API to derive PBKDF2-HMAC-SHA256 password hashes
 * matching the Cloudflare Worker authentication runtime.
 *
 * Usage:
 *   node scripts/bootstrap-admin.mjs --email="admin@yourdomain.com" --password="YourStrongPassword123!"
 *   node scripts/bootstrap-admin.mjs --url="http://localhost:8787" --email="admin@tools4genz.com" --password="..."
 */

const encoder = new TextEncoder();
const ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function toHex(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BITS
  );

  return `pbkdf2_sha256$${ITERATIONS}$${toHex(salt)}$${toHex(derivedBits)}`;
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const found = args.find((a) => a.startsWith(`--${name}=`));
    return found ? found.split('=')[1] : null;
  };

  const email = getArg('email');
  const password = getArg('password');
  const url = getArg('url');

  if (!email || !password) {
    console.log(`
Tools4Genz — Secure Admin Bootstrap Helper
===========================================
Usage:
  node scripts/bootstrap-admin.mjs --email="<admin_email>" --password="<strong_password>" [--url="<worker_api_url>"]

Options:
  --email     Admin user email address (required)
  --password  Admin user password (min 8 characters) (required)
  --url       (Optional) Target API URL to trigger /api/auth/bootstrap directly
`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const hash = await hashPassword(password);
  const now = new Date().toISOString();

  console.log('\n🔒 Generated Secure PBKDF2 Password Hash:');
  console.log(`   Email: ${normalizedEmail}`);
  console.log(`   Hash:  ${hash}`);

  if (url) {
    console.log(`\n🚀 Calling bootstrap API at ${url}/api/auth/bootstrap...`);
    try {
      const resp = await fetch(`${url.replace(/\/+$/, '')}/api/auth/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const data = await resp.json();
      if (resp.ok) {
        console.log('✅ Bootstrap successful! Response:', data);
      } else {
        console.error('❌ Bootstrap failed with status', resp.status, data);
      }
    } catch (err) {
      console.error('❌ Network error during bootstrap:', err.message);
    }
  } else {
    console.log('\n📋 Direct Cloudflare D1 SQL Command (if running manual SQL):');
    const sql = `INSERT INTO admin_users (email, password_hash, role, status, created_at, updated_at) VALUES ('${normalizedEmail}', '${hash}', 'admin', 'active', '${now}', '${now}');`;
    console.log(`\nwrangler d1 execute tools4genz-db --command="${sql}"\n`);
  }
}

main().catch(console.error);
