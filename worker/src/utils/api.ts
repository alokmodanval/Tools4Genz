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
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'PAYLOAD_TOO_LARGE'
  | 'BAD_JSON'
  | 'INTERNAL_ERROR';

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