/**
 * Server-generated request reference IDs.
 * Format: TG-REQ-XXXXXXXX (8 hex chars, uppercase)
 */
export function generateRequestId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(4));
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `TG-REQ-${hex}`;
}