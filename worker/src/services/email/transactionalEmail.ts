import { D1Database, orderRepository, transactionalEmailRepository } from '../../db/repository';
import { EmailBindings, TransactionalEmailProvider } from './emailProvider';
import { ResendEmailProvider } from './resendProvider';
import { buildReceiptEmail } from './templates';

export function resolveEmailProvider(bindings: EmailBindings): TransactionalEmailProvider | null {
  if (bindings.EMAIL_PROVIDER) return bindings.EMAIL_PROVIDER;
  if (bindings.RESEND_API_KEY && bindings.EMAIL_FROM) {
    return new ResendEmailProvider(bindings.RESEND_API_KEY, bindings.EMAIL_FROM);
  }
  return null;
}

export async function ensurePurchaseReceipt(
  db: D1Database,
  orderId: string,
  bindings: EmailBindings
): Promise<'sent' | 'skipped' | 'failed' | 'not_configured'> {
  const provider = resolveEmailProvider(bindings);
  if (!provider) return 'not_configured';

  const order = await orderRepository.findByOrderId(db, orderId);
  if (!order || order.status !== 'paid') return 'skipped';

  const dedupeKey = `receipt:${order.order_id}`;
  let claimed = await transactionalEmailRepository.createProcessing(db, {
    orderId: order.order_id,
    emailType: 'receipt',
    dedupeKey,
    provider: provider.name,
  });
  if (!claimed) {
    const existing = await transactionalEmailRepository.findByDedupeKey(db, dedupeKey);
    if (!existing || existing.status === 'sent' || existing.status === 'processing') return 'skipped';
    claimed = await transactionalEmailRepository.claimFailedRetry(db, dedupeKey);
    if (!claimed) return 'skipped';
  }

  try {
    const email = buildReceiptEmail(order, bindings.SITE_URL || 'https://tools4genz.com');
    const result = await provider.send({
      to: order.customer_email.trim().toLowerCase(),
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: dedupeKey,
    });
    await transactionalEmailRepository.markSent(db, dedupeKey, result.messageId);
    return 'sent';
  } catch (sendError) {
    const safeError = sendError instanceof Error ? sendError.message : 'Email provider request failed';
    await transactionalEmailRepository.markFailed(db, dedupeKey, safeError);
    return 'failed';
  }
}

export type { EmailBindings, TransactionalEmailProvider } from './emailProvider';
