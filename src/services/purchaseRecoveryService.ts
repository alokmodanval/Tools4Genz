import { API_BASE_URL } from '@/config/api';

export interface RecoveredPurchase {
  orderId: string;
  accessToken: string;
  projectId: string;
  projectTitle: string;
  createdAt: string;
  recovered: true;
}

export class RecoveryApiError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

export const purchaseRecoveryService = {
  async request(email: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/purchases/recovery/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const payload = await response.json() as { success?: boolean; message?: string; error?: { message?: string } };
    if (!response.ok || !payload.success) throw new Error(payload.error?.message || 'Unable to request recovery.');
    return payload.message || 'If purchases are associated with this email, recovery instructions will be sent.';
  },

  async redeem(token: string): Promise<RecoveredPurchase> {
    const response = await fetch(`${API_BASE_URL}/api/purchases/recovery/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const payload = await response.json() as {
      success?: boolean;
      data?: RecoveredPurchase;
      error?: { code?: string; message?: string };
    };
    if (!response.ok || !payload.success || !payload.data) {
      throw new RecoveryApiError(payload.error?.code || 'RECOVERY_INVALID', payload.error?.message || 'Unable to restore purchase.');
    }
    return payload.data;
  },
};

