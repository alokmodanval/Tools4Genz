/**
 * Safe request body reading with a strict size cap.
 *
 * This is the abuse-preparation point: an explicit limit prevents
 * arbitrarily huge JSON payloads from being parsed.
 */
export const MAX_BODY_BYTES = 64 * 1024; // 64 KB

export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await readTextBody(request);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BadJsonError();
  }
}

export async function readTextBody(request: Request): Promise<string> {
  const contentLength = Number(request.headers.get('Content-Length') ?? '0');

  if (contentLength > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }

  const text = await request.text();

  if (text.length > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }

  return text;
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
