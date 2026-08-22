import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { MailService } from './mail.service';
import { ConsoleMailAdapter } from './console-mail.adapter';
import { UnconfiguredMailAdapter } from './unconfigured-mail.adapter';
import { ResendMailAdapter } from './resend-mail.adapter';

/** Raised at boot for a configuration mistake, so it can never surface as a silent runtime failure. */
export class MailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailConfigurationError';
  }
}

const SUPPORTED = ['resend', 'console'] as const;

/**
 * Chooses the MailService implementation from environment configuration.
 *
 * The rules exist to make one specific accident impossible: deploying to
 * production believing email works while it is only being printed to the API
 * console. Production therefore never resolves to ConsoleMailAdapter — not by
 * omission, and not even when explicitly asked.
 *
 *   dev/test,  EMAIL_PROVIDER unset or 'console'  -> ConsoleMailAdapter
 *   any env,   EMAIL_PROVIDER='resend'            -> ResendMailAdapter
 *   production, EMAIL_PROVIDER unset              -> UnconfiguredMailAdapter (fails loudly on send)
 *   production, EMAIL_PROVIDER='console'          -> boot error
 *   any env,   unsupported value                  -> boot error
 *   'resend' without API key or sender            -> boot error
 */
export function createMailService(config: ConfigService): MailService {
  const logger = new Logger('MailProvider');
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const raw = config.get<string>('EMAIL_PROVIDER')?.trim().toLowerCase();

  if (!raw) {
    if (isProduction) {
      logger.error(
        'EMAIL_PROVIDER is not set. Production email is DISABLED: delivery will fail loudly rather than be silently discarded. Set EMAIL_PROVIDER=resend to enable it.',
      );
      return new UnconfiguredMailAdapter();
    }
    return new ConsoleMailAdapter();
  }

  if (!SUPPORTED.includes(raw as (typeof SUPPORTED)[number])) {
    throw new MailConfigurationError(
      `Unsupported EMAIL_PROVIDER "${raw}". Supported values: ${SUPPORTED.join(', ')}.`,
    );
  }

  if (raw === 'console') {
    if (isProduction) {
      throw new MailConfigurationError(
        'EMAIL_PROVIDER=console is not permitted in production — it would discard password-reset and verification email while appearing to succeed. Use EMAIL_PROVIDER=resend.',
      );
    }
    return new ConsoleMailAdapter();
  }

  // raw === 'resend'
  const apiKey = config.get<string>('RESEND_API_KEY')?.trim();
  const from = config.get<string>('EMAIL_FROM')?.trim();

  // Named, never valued — the key must not reach logs or error messages.
  if (!apiKey) {
    throw new MailConfigurationError(
      'EMAIL_PROVIDER=resend requires RESEND_API_KEY to be set.',
    );
  }
  if (!from) {
    throw new MailConfigurationError(
      'EMAIL_PROVIDER=resend requires EMAIL_FROM to be set (an address on your Resend-verified domain).',
    );
  }

  logger.log(`Transactional email provider: resend (sender: ${from})`);
  return new ResendMailAdapter(new Resend(apiKey), from);
}
