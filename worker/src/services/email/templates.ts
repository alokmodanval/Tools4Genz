import { OrderRow } from '../../db/schema';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char] || char);
}

function formatAmount(amount: number, currency: string): string {
  return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
}

export function buildReceiptEmail(order: OrderRow, siteUrl: string) {
  const project = escapeHtml(order.project_title);
  const orderId = escapeHtml(order.order_id);
  const amount = escapeHtml(formatAmount(order.amount, order.currency));
  const safeSiteUrl = escapeHtml(siteUrl.replace(/\/$/, ''));
  const subjectProject = order.project_title.replace(/[\r\n]+/g, ' ').slice(0, 120);
  return {
    subject: `Payment receipt — ${subjectProject}`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827">
      <h1>Payment received</h1><p>Thank you for purchasing from Tools4Genz.</p>
      <p><strong>Project:</strong> ${project}<br><strong>Order:</strong> ${orderId}<br>
      <strong>Amount:</strong> ${amount}<br><strong>Status:</strong> Paid<br>
      <strong>Purchase date:</strong> ${escapeHtml(order.paid_at || order.updated_at)}</p>
      <p><a href="${safeSiteUrl}/my-purchases">Access your purchase</a></p>
      <p>This receipt does not contain your private purchase access key.</p>
    </body></html>`,
    text: `Tools4Genz payment receipt\n\nProject: ${order.project_title}\nOrder: ${order.order_id}\nAmount: ${formatAmount(order.amount, order.currency)}\nStatus: Paid\nPurchase date: ${order.paid_at || order.updated_at}\n\nAccess your purchase: ${siteUrl.replace(/\/$/, '')}/my-purchases\n`,
  };
}

export function buildRecoveryEmail(
  orders: Array<{ order: OrderRow; recoveryToken: string }>,
  siteUrl: string
) {
  const baseUrl = siteUrl.replace(/\/$/, '');
  const htmlActions = orders.map(({ order, recoveryToken }) => {
    const link = `${baseUrl}/purchase/recover#token=${recoveryToken}`;
    return `<li style="margin-bottom:18px"><strong>${escapeHtml(order.project_title)}</strong><br>
      Order ${escapeHtml(order.order_id)}<br><a href="${escapeHtml(link)}">Restore this purchase</a></li>`;
  }).join('');
  const textActions = orders.map(({ order, recoveryToken }) =>
    `${order.project_title} (${order.order_id})\n${baseUrl}/purchase/recover#token=${recoveryToken}`
  ).join('\n\n');
  return {
    subject: 'Restore your Tools4Genz purchases',
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827">
      <h1>Restore your purchases</h1><p>Each link is valid once for 30 minutes.</p>
      <ul>${htmlActions}</ul><p>If you did not request this email, you can ignore it.</p>
    </body></html>`,
    text: `Restore your Tools4Genz purchases\n\nEach link is valid once for 30 minutes.\n\n${textActions}\n\nIf you did not request this email, ignore it.`,
  };
}
