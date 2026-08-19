import { D1Database } from '../db/repository';
import { EmailBindings } from '../services/email/emailProvider';
import { redeemPurchaseRecovery, requestPurchaseRecovery } from '../services/purchaseRecovery';
import { error, json, success } from '../utils/api';
import { BodyTooLargeError, readJsonBody } from '../utils/body';

const GENERIC_MESSAGE = 'If purchases are associated with this email, recovery instructions will be sent.';

export async function handleRequestPurchaseRecovery(
  request: Request,
  db: D1Database,
  env: EmailBindings
): Promise<Response> {
  let body: Record<string, unknown> = {};
  try { body = await readJsonBody(request) as Record<string, unknown>; } catch (caught) {
    if (caught instanceof BodyTooLargeError) return error('PAYLOAD_TOO_LARGE', 'Request body is too large', 413);
    /* malformed recovery requests retain the generic non-enumerating response */
  }
  const email = typeof body.email === 'string' ? body.email : '';
  try {
    await requestPurchaseRecovery(db, email, env);
  } catch (recoveryError) {
    console.error('[PurchaseRecovery] Request processing failed:', recoveryError);
  }
  return json({ success: true, message: GENERIC_MESSAGE }, 202);
}

export async function handleRedeemPurchaseRecovery(request: Request, db: D1Database): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request) as Record<string, unknown>; }
  catch (caught) { return caught instanceof BodyTooLargeError ? error('PAYLOAD_TOO_LARGE', 'Request body is too large', 413) : error('VALIDATION_ERROR', 'Invalid JSON body', 400); }
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const result = await redeemPurchaseRecovery(db, token);
  if (!result.ok) {
    if (result.reason === 'expired') return error('RECOVERY_EXPIRED', 'This recovery link has expired.', 410);
    if (result.reason === 'used') return error('RECOVERY_USED', 'This recovery link has already been used.', 410);
    return error('RECOVERY_INVALID', 'This recovery link is invalid.', 400);
  }
  return success({
    orderId: result.orderId,
    accessToken: result.accessToken,
    projectId: result.projectId,
    projectTitle: result.projectTitle,
    createdAt: result.createdAt,
    recovered: true,
  });
}
