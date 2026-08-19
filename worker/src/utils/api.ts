/**
 * Consistent API response helpers.
 *
 * Success:
 *   { success: true, data: {...} }
 *
 * Error:
 *   { success: false, error: { code, message } }
 */

export interface ApiErrorShape {
  code: string;
  message: string;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BOOTSTRAP_DISABLED'
  | 'INVALID_SIGNATURE'
  | 'PAYMENT_ERROR'
  | 'PROJECT_NOT_AVAILABLE'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'PAYLOAD_TOO_LARGE'
  | 'BAD_JSON'
  | 'INTERNAL_ERROR'
  | 'ALREADY_PAID'
  | 'INVALID_STATE'
  | 'FEATURE_NOT_ENABLED'
  | 'PAYMENT_REQUIRED'
  | 'DELIVERY_NOT_FOUND'
  | 'DELIVERY_NOT_READY'
  | 'DELIVERY_PROVIDER_ERROR'
  | 'DELIVERY_EXPIRED'
  | 'STORAGE_NOT_CONFIGURED'
  | 'STORAGE_ERROR'
  | 'FILE_TOO_LARGE'
  | 'UNSAFE_FILE_TYPE'
  | 'RELEASE_OBJECT_MISSING'
  | 'PURCHASE_ACCESS_REQUIRED'
  | 'PURCHASE_ACCESS_DENIED'
  | 'PURCHASE_ACCESS_UNAVAILABLE'
  | 'RECOVERY_INVALID'
  | 'RECOVERY_EXPIRED'
  | 'RECOVERY_USED'
  | 'CUSTOMER_AUTH_REQUIRED'
  | 'LOGIN_CODE_INVALID'
  | 'LOGIN_CODE_EXPIRED'
  | 'RATE_LIMITED';

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export function success(data: unknown, status = 200): Response {
  return json({ success: true, data }, status);
}

export function error(code: ErrorCode, message: string, status: number): Response {
  return json(
    {
      success: false,
      error: { code, message } satisfies ApiErrorShape,
    },
    status
  );
}
