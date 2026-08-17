/**
 * Order & Payment API client service for Tools4Genz (Phase 8A).
 */

import {
  CreateOrderPayload,
  CreateOrderResponse,
  PublicOrderSummary,
  VerifyPaymentPayload,
  VerifyPaymentResponse,
} from '@/types/order';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Dynamically loads the official Razorpay Checkout script if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Order Service Client
 */
export const orderService = {
  /**
   * Create an internal order & Razorpay Test Order.
   */
  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
    const url = `${API_BASE_URL}/api/orders`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to create order. Please try again.');
    }

    return data.data as CreateOrderResponse;
  },

  /**
   * Verify checkout signature server-side.
   */
  async verifyPayment(
    orderId: string,
    payload: VerifyPaymentPayload
  ): Promise<VerifyPaymentResponse> {
    const url = `${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/verify-payment`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Payment verification failed.');
    }

    return data.data as VerifyPaymentResponse;
  },

  /**
   * Fetch public order status summary.
   */
  async getOrderStatus(orderId: string): Promise<PublicOrderSummary> {
    const url = `${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Order not found.');
    }

    return data.data as PublicOrderSummary;
  },
};

export default orderService;
