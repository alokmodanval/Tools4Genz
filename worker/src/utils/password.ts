/**
 * Password hashing utilities using standard Web Crypto API (PBKDF2-HMAC-SHA256).
 *
 * Cloudflare Workers provide `crypto.subtle` natively with zero external
 * dependencies. PBKDF2 with HMAC-SHA256 and 100,000 iterations is compliant
 * with OWASP recommendations and works seamlessly in all standard environments.
 *
 * Hash format: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
 *   - iterations: 100000
 *   - salt: 16 cryptographically secure random bytes
 *   - hash: 32 bytes (256 bits)
 */

const encoder = new TextEncoder();
const ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function fromHex(hex: string): Uint8Array {
  const len = hex.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Constant-time comparison of two byte arrays to prevent timing side-channel attacks.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Derive PBKDF2-HMAC-SHA256 key bits from password + salt.
 */
async function derivePbkdf2(
  password: string,
  saltBytes: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
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
      salt: saltBytes as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BITS
  );

  return new Uint8Array(derivedBits);
}

/**
 * Hash a plaintext password for storage.
 * Returns a string in the format: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derivePbkdf2(password, salt, ITERATIONS);
  return `pbkdf2_sha256$${ITERATIONS}$${toHex(salt)}$${toHex(derived)}`;
}

/**
 * Verify a plaintext password against a stored PBKDF2 hash.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') {
      return false;
    }

    const iterations = parseInt(parts[1], 10);
    if (isNaN(iterations) || iterations < 1000) {
      return false;
    }

    const salt = fromHex(parts[2]);
    const expectedHash = fromHex(parts[3]);
    const actualHash = await derivePbkdf2(password, salt, iterations);

    return constantTimeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}
