/**
 * Browser-local guest purchase references.
 *
 * The access token is equivalent to a purchase password. localStorage keeps the
 * MVP recoverable across reloads on this device, but it is readable by same-origin
 * JavaScript. Keep the app free of untrusted HTML and never render or log tokens.
 */
export interface SavedPurchase {
  orderId: string;
  accessToken: string;
  projectId: string;
  projectTitle: string;
  createdAt: string;
}

const STORAGE_KEY = 'tools4genz.purchases.v1';
const ORDER_PATTERN = /^TG-ORD-[A-Z0-9-]+$/;
const TOKEN_PATTERN = /^pt_[A-Za-z0-9_-]{43}$/;

function isSavedPurchase(value: unknown): value is SavedPurchase {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.orderId === 'string' && ORDER_PATTERN.test(item.orderId) &&
    typeof item.accessToken === 'string' && TOKEN_PATTERN.test(item.accessToken) &&
    typeof item.projectId === 'string' &&
    typeof item.projectTitle === 'string' &&
    typeof item.createdAt === 'string'
  );
}

export function getPurchases(): SavedPurchase[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isSavedPurchase) : [];
  } catch {
    return [];
  }
}

export function savePurchase(purchase: SavedPurchase): void {
  if (typeof window === 'undefined' || !isSavedPurchase(purchase)) return;
  try {
    const purchases = getPurchases().filter((item) => item.orderId !== purchase.orderId);
    purchases.unshift(purchase);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
  } catch {
    // Storage can be unavailable in private/locked-down browser contexts.
    // The active checkout keeps its in-memory token and must continue safely.
  }
}

export function removePurchase(orderId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const purchases = getPurchases().filter((item) => item.orderId !== orderId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
  } catch {
    // Removing the local reference never mutates the server purchase.
  }
}
