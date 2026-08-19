import {
  TransactionalEmailMessage,
  TransactionalEmailProvider,
  TransactionalEmailResult,
} from './emailProvider';

export class ResendEmailProvider implements TransactionalEmailProvider {
  readonly name = 'resend';

  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: TransactionalEmailMessage): Promise<TransactionalEmailResult> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': message.idempotencyKey,
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email provider rejected the request with HTTP ${response.status}`);
    }
    const data = await response.json() as { id?: string };
    return { provider: this.name, messageId: data.id || null };
  }
}

