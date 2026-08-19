/**
 * Order & Payment API client service for Tools4Genz (Phase 8A).
 */

import {
  CreateOrderPayload,
  CreateOrderResponse,
  OrderQrResponse,
  PublicOrderSummary,
  ProjectPurchaseAvailability,
  VerifyPaymentPayload,
  VerifyPaymentResponse,
} from '@/types/order';
import { API_BASE_URL } from '@/config/api';

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
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

function purchaseAuthorization(accessToken: string): Record<string, string> {
  return { Authorization: `Purchase ${accessToken}` };
}

/**
 * Order Service Client
 */
export const orderService = {
  async getProjectAvailability(projectId: string): Promise<ProjectPurchaseAvailability> {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/availability`, { credentials: 'include' }
    );
    const data = (await response.json()) as {
      success?: boolean;
      data?: ProjectPurchaseAvailability;
      error?: { message?: string };
    };
    if (!response.ok || !data.success || !data.data) {
      throw new Error(data.error?.message || 'Project availability could not be verified.');
    }
    return data.data;
  },

  /**
   * Create an internal order & Razorpay Test Order.
   */
  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
    const url = `${API_BASE_URL}/api/orders`;
    let response: Response;
    try {
      response = await fetch(url, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      throw new Error(
        `Unable to reach payment server at ${url}. Please verify your network connection.`,
        { cause: networkErr }
      );
    }

    let data: { success?: boolean; error?: { message?: string }; data?: CreateOrderResponse };
    try {
      data = await response.json();
    } catch (parseErr) {
      throw new Error(
        `Server returned HTTP ${response.status} (${response.statusText || 'Non-JSON response'})`,
        { cause: parseErr }
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || `Failed to create order (HTTP ${response.status}). Please try again.`);
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
    let response: Response;
    try {
      response = await fetch(url, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      throw new Error(
        `Unable to reach verification server at ${url}. Please verify your network connection.`,
        { cause: networkErr }
      );
    }

    let data: { success?: boolean; error?: { message?: string }; data?: VerifyPaymentResponse };
    try {
      data = await response.json();
    } catch (parseErr) {
      throw new Error(
        `Payment verification returned HTTP ${response.status} (${response.statusText || 'Non-JSON response'})`,
        { cause: parseErr }
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || `Payment verification failed (HTTP ${response.status}).`);
    }

    return data.data as VerifyPaymentResponse;
  },

  /**
   * Request a Dynamic UPI QR code for an existing order.
   *
   * The QR amount is locked to the server-created order amount.
   * The frontend never supplies or edits the amount.
   */
  async getPaymentQr(orderId: string): Promise<OrderQrResponse> {
    const url = `${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/payment/qr`;
    let response: Response;
    try {
      response = await fetch(url, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (networkErr) {
      throw new Error(
        `Unable to reach QR payment server at ${url}. Please verify your network connection.`,
        { cause: networkErr }
      );
    }

    let data: { success?: boolean; error?: { message?: string }; data?: OrderQrResponse };
    try {
      data = await response.json();
    } catch (parseErr) {
      throw new Error(
        `QR payment request returned HTTP ${response.status} (${response.statusText || 'Non-JSON response'})`,
        { cause: parseErr }
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || `QR payment request failed (HTTP ${response.status}).`);
    }

    return data.data as OrderQrResponse;
  },

  /**
   * Fetch public order status summary.
   */
  async getOrderStatus(orderId: string, accessToken: string): Promise<PublicOrderSummary> {
    const url = `${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}`;
    let response: Response;
    try {
      response = await fetch(url, { credentials: 'include', headers: purchaseAuthorization(accessToken) });
    } catch (networkErr) {
      throw new Error(`Unable to reach server for order lookup.`, { cause: networkErr });
    }

    let data: { success?: boolean; error?: { message?: string }; data?: PublicOrderSummary };
    try {
      data = await response.json();
    } catch (parseErr) {
      throw new Error(`Order lookup returned HTTP ${response.status}`, { cause: parseErr });
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || `Order not found (HTTP ${response.status}).`);
    }

    return data.data as PublicOrderSummary;
  },

  /**
   * Phase 9 — Securely download the purchased project ZIP.
   * The Worker authorizes the download against the paid order/delivery.
   */
  async downloadProject(orderId: string, accessToken: string): Promise<{ blob: Blob; filename: string }> {
    const url = `${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/download`;
    let response: Response;
    try {
      response = await fetch(url, { credentials: 'include', headers: purchaseAuthorization(accessToken) });
    } catch (networkErr) {
      throw new Error(`Unable to reach download server. Please check your network connection.`, {
        cause: networkErr,
      });
    }

    if (!response.ok) {
      let message = `Download failed (HTTP ${response.status}).`;
      try {
        const data = (await response.json()) as { error?: { message?: string } };
        if (data.error?.message) message = data.error.message;
      } catch {
        // ignore parse error — fallback to generic message
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    // Extract filename from Content-Disposition if present.
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || `project-${orderId}.zip`;

    return { blob, filename };
  },
};

export default orderService;
