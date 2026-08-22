export interface SendEmailOptions {
  to: string;
  subject: string;
  /**
   * Plain-text body. Required, not optional: it is the accessible fallback
   * for clients that refuse HTML, and it keeps the message readable if the
   * HTML part is stripped in transit.
   */
  text: string;
  /**
   * Optional HTML body. Adapters that cannot render HTML (ConsoleMailAdapter)
   * ignore it and fall back to `text`, so adding this stayed backward
   * compatible with every existing caller and adapter.
   */
  html?: string;
}

export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface MailService {
  send(options: SendEmailOptions): Promise<void>;
}
