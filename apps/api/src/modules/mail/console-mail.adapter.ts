import { Injectable, Logger } from '@nestjs/common';
import type { MailService, SendEmailOptions } from './mail.service';

/**
 * DEVELOPMENT PLACEHOLDER — logs the email instead of sending it.
 *
 * The transactional email provider is an open decision (plan section 13,
 * Open Question #1: Azure Communication Services vs. SendGrid/Resend vs. an
 * existing Microsoft 365 tenant) — not yet chosen by the client. Rather than
 * block the whole email-verification / password-reset / notification
 * workflow on that unrelated decision, this adapter makes the workflow real
 * and testable (token generation, storage, expiry, single-use — all real)
 * while being honest that delivery isn't wired to a real inbox yet.
 *
 * Swap this provider binding in AuthModule for a real adapter once a
 * provider is chosen — nothing else in the auth flow needs to change.
 */
@Injectable()
export class ConsoleMailAdapter implements MailService {
  private readonly logger = new Logger(ConsoleMailAdapter.name);

  send(options: SendEmailOptions): Promise<void> {
    this.logger.warn(
      `[DEV PLACEHOLDER — no email provider configured yet] Would send to ${options.to}: "${options.subject}"\n${options.text}`,
    );
    return Promise.resolve();
  }
}
