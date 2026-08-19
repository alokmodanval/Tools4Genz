import { adminSessionRepository, adminUserRepository, D1Database } from '../db/repository';
import { error, success } from '../utils/api';
import { verifySession, extractSessionToken } from '../utils/auth';
import { hashPassword, verifyPassword } from '../utils/password';
import { hashSessionToken } from '../utils/sessionToken';
import { BodyTooLargeError, readJsonBody } from '../utils/body';

/**
 * POST /api/auth/bootstrap
 * One-time setup endpoint to create the initial admin user.
 * Allowed ONLY when the admin_users table contains 0 users.
 * Once any admin exists, this endpoint permanently returns 403 Forbidden.
 */
export async function handleBootstrap(request: Request, db: D1Database): Promise<Response> {
  const existingCount = await adminUserRepository.count(db);
  if (existingCount > 0) {
    return error(
      'BOOTSTRAP_DISABLED',
      'Initial admin account already bootstrapped. This endpoint is permanently disabled.',
      403
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await readJsonBody(request);
  } catch (caught) {
    if (caught instanceof BodyTooLargeError) return error('PAYLOAD_TOO_LARGE', 'Request body is too large', 413);
    return error('BAD_JSON', 'Request body must be valid JSON', 400);
  }

  if (typeof rawBody !== 'object' || rawBody === null) {
    return error('VALIDATION_ERROR', 'Invalid request body', 400);
  }

  const { email, password } = rawBody as { email?: string; password?: string };

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return error('VALIDATION_ERROR', 'Email and password are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return error('VALIDATION_ERROR', 'A valid email address is required', 400);
  }

  if (password.length < 8) {
    return error('VALIDATION_ERROR', 'Password must be at least 8 characters long', 400);
  }

  const passwordHash = await hashPassword(password);
  const userId = await adminUserRepository.create(db, {
    email: normalizedEmail,
    password_hash: passwordHash,
    role: 'admin',
  });

  // Generate cryptographically secure session for seamless bootstrap onboarding
  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  let token = '';
  for (let i = 0; i < randomBytes.length; i++) {
    token += randomBytes[i].toString(16).padStart(2, '0');
  }

  const maxAgeSeconds = 7 * 24 * 60 * 60; // 7 days
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();

  await adminSessionRepository.create(db, {
    admin_user_id: userId,
    session_token_hash: await hashSessionToken(token),
    expires_at: expiresAt,
  });

  const isHttps = new URL(request.url).protocol === 'https:';
  const cookieFlags = [
    `session_token=${token}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${isHttps ? 'None' : 'Lax'}`,
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isHttps) {
    cookieFlags.push('Secure');
  }

  const response = success(
    {
      userId,
      email: normalizedEmail,
      role: 'admin',
      bootstrapped: true,
    },
    201
  );

  response.headers.set('Set-Cookie', cookieFlags.join('; '));
  return response;
}


/**
 * POST /api/auth/login
 * Admin login with email and password.
 * On success, creates a session in D1 and sets an HttpOnly cookie.
 */
export async function handleLogin(request: Request, db: D1Database): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await readJsonBody(request);
  } catch (caught) {
    if (caught instanceof BodyTooLargeError) return error('PAYLOAD_TOO_LARGE', 'Request body is too large', 413);
    return error('BAD_JSON', 'Request body must be valid JSON', 400);
  }

  if (typeof rawBody !== 'object' || rawBody === null) {
    return error('VALIDATION_ERROR', 'Invalid request body', 400);
  }

  const { email, password } = rawBody as { email?: string; password?: string };

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return error('VALIDATION_ERROR', 'Email and password are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await adminUserRepository.findByEmail(db, normalizedEmail);

  if (!user || user.status !== 'active') {
    // Constant-time behavior / generic error to prevent user enumeration
    return error('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    return error('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // Update last login
  await adminUserRepository.updateLastLogin(db, user.id);

  // Generate cryptographically secure random session token
  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  let token = '';
  for (let i = 0; i < randomBytes.length; i++) {
    token += randomBytes[i].toString(16).padStart(2, '0');
  }

  const maxAgeSeconds = 7 * 24 * 60 * 60; // 7 days
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();

  await adminSessionRepository.create(db, {
    admin_user_id: user.id,
    session_token_hash: await hashSessionToken(token),
    expires_at: expiresAt,
  });

  const isHttps = new URL(request.url).protocol === 'https:';
  const cookieFlags = [
    `session_token=${token}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${isHttps ? 'None' : 'Lax'}`,
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isHttps) {
    cookieFlags.push('Secure');
  }

  const response = success(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    200
  );

  response.headers.set('Set-Cookie', cookieFlags.join('; '));
  return response;
}

/**
 * POST /api/auth/logout
 * Admin logout - deletes session record from D1 and expires the cookie.
 */
export async function handleLogout(request: Request, db: D1Database): Promise<Response> {
  const token = extractSessionToken(request);
  if (token) {
    await adminSessionRepository.deleteByTokenHash(db, await hashSessionToken(token));
  }

  const isHttps = new URL(request.url).protocol === 'https:';
  const cookieFlags = [
    'session_token=',
    'Path=/',
    'HttpOnly',
    `SameSite=${isHttps ? 'None' : 'Lax'}`,
    'Max-Age=0',
  ];
  if (isHttps) {
    cookieFlags.push('Secure');
  }

  const response = success({ loggedOut: true }, 200);
  response.headers.set('Set-Cookie', cookieFlags.join('; '));
  return response;
}

/**
 * GET /api/auth/me
 * Returns authenticated admin session profile or 401.
 */
export async function handleMe(request: Request, db: D1Database): Promise<Response> {
  const session = await verifySession(request, db);
  if (!session) {
    return error('UNAUTHORIZED', 'No active session or session expired', 401);
  }

  return success({
    userId: session.userId,
    email: session.email,
    role: session.role,
    status: session.status,
  });
}
