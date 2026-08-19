/**
 * Types for Tools4Genz Order & Payment System (Phase 8A).
 */

export type OrderStatus =
  | 'created'
  | 'payment_pending'
  | 'paid'
  | 'payment_failed'
  | 'cancelled'
  | 'refunded';

export interface Order {
  orderId: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  amount: number;
  currency: string;
  status: OrderStatus;
  paymentProvider: string;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface CreateOrderPayload {
  projectId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  /** Returned once at creation. Never include this value in URLs or UI text. */
  accessToken: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  project: {
    id: string;
    slug: string;
    title: string;
  };
  customer: {
    name: string;
    email: string;
  };
}

export interface ProjectPurchaseAvailability {
  projectId: string;
  purchasable: boolean;
  status: 'available' | 'unavailable';
  message: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  orderId: string;
  status: 'paid';
  providerPaymentId: string;
  paidAt: string;
  amount: number;
  currency: string;
  projectTitle: string;
}

export interface PublicOrderSummary {
  orderId: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  paymentProvider: string;
  paidAt?: string | null;
  createdAt: string;
  /** Phase 9: Digital delivery status (pending | ready | failed | null) */
  deliveryStatus?: string | null;
}

/**
 * Phase 9 — Digital Delivery status.
 */
export type DeliveryStatus = 'pending' | 'ready' | 'failed';

/**
 * Dynamic UPI QR payment data returned by
 * POST /api/orders/:orderId/payment/qr
 *
 * The amount is server-authoritative and locked to the order amount.
 * The frontend MUST NOT allow the user to edit it.
 */
export interface OrderQrResponse {
  orderId: string;
  qrId: string;
  imageUrl: string;
  amount: number; // in INR (locked to server order amount)
  currency: string;
  expiresAt: string;
}

/**
 * Razorpay SDK options for window.Razorpay.
 */
export interface RazorpayOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: unknown) => void) => void;
    };
  }
}
