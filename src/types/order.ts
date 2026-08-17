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
  providerPaymentId?: string | null;
  paidAt?: string | null;
  createdAt: string;
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
