export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
}

export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface MailService {
  send(options: SendEmailOptions): Promise<void>;
}
