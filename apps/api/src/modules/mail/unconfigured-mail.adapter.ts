import { Injectable, Logger } from '@nestjs/common';
import type { MailService, SendEmailOptions } from './mail.service';

/**
 * PRODUCTION SAFETY NET — refuses to pretend.
 *
 * ConsoleMailAdapter resolves successfully after only logging, which is the
 * right behaviour in development but actively dangerous in production: an
 * admin locked out of the CMS would get a "reset link sent" response, no
 * email, and no error anywhere to explain it.
 *
 * This adapter is bound instead when NODE_ENV=production and no transactional
 * email provider has been configured, so the failure is loud and traceable
 * rather than silent. It is not a provider and never will be — replace the
 * MAIL_SERVICE binding in AuthModule with a real adapter once the client
 * chooses one (see the provider decision recorded in console-mail.adapter.ts).
 */
@Injectable()
export class UnconfiguredMailAdapter implements MailService {
  private readonly logger = new Logger(UnconfiguredMailAdapter.name);

  send(options: SendEmailOptions): Promise<void> {
    // Subject and recipient only — never the body, which carries reset and
    // verification tokens.
    this.logger.error(
      `Email to ${options.to} ("${options.subject}") was NOT sent: no transactional email provider is configured in this environment.`,
    );
    return Promise.reject(
      new Error(
        'No transactional email provider is configured. Set EMAIL_PROVIDER=resend (with RESEND_API_KEY and EMAIL_FROM) to enable delivery.',
      ),
    );
  }
}
