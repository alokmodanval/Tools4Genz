/**
 * Safe request body reading with a strict size cap.
 *
 * This is the abuse-preparation point: an explicit limit prevents
 * arbitrarily huge JSON payloads from being parsed.
 */
export const MAX_BODY_BYTES = 64 * 1024; // 64 KB

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get('Content-Length') ?? '0');

  if (contentLength > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }

  const text = await request.text();

  if (text.length > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BadJsonError();
  }
}

export class BodyTooLargeError extends Error {
  constructor() {
    super('Request body too large');
    this.name = 'BodyTooLargeError';
  }
}

export class BadJsonError extends Error {
  constructor() {
    super('Malformed JSON body');
    this.name = 'BadJsonError';
  }
}