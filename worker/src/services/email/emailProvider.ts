export interface TransactionalEmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Stable provider-level idempotency key. */
  idempotencyKey: string;
}

export interface TransactionalEmailResult {
  provider: string;
  messageId: string | null;
}

export interface TransactionalEmailProvider {
  readonly name: string;
  send(message: TransactionalEmailMessage): Promise<TransactionalEmailResult>;
}

export interface EmailBindings {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  SITE_URL?: string;
  /** Test-only dependency injection; never configured as a Worker binding. */
  EMAIL_PROVIDER?: TransactionalEmailProvider;
}

