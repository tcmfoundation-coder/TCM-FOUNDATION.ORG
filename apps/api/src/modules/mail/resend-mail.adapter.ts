import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import type { MailService, SendEmailOptions } from './mail.service';

/**
 * Categories are what gets logged and what callers can reason about — the
 * raw provider error never leaves this adapter, and never reaches an end
 * user.
 */
export type ResendFailureCategory =
  | 'unauthorized'
  | 'invalid_sender'
  | 'invalid_recipient'
  | 'rate_limited'
  | 'provider_error'
  | 'network_error'
  | 'unknown';

/** Thrown for every delivery failure so callers see one predictable shape. */
export class MailDeliveryError extends Error {
  constructor(
    readonly category: ResendFailureCategory,
    message: string,
  ) {
    super(message);
    this.name = 'MailDeliveryError';
  }
}

interface ResendErrorLike {
  name?: string;
  message?: string;
  statusCode?: number;
}

// Maps Resend's error name/status onto a category. Resend returns errors in
// the response body rather than throwing, so both paths funnel through here.
function categorize(error: ResendErrorLike): ResendFailureCategory {
  const name = (error.name ?? '').toLowerCase();
  const status = error.statusCode;

  // Sender problems are matched before the status check: an unverified domain
  // comes back as 403, but "your sending domain isn't verified" is a very
  // different fix from "your API key is wrong", and the operator needs to be
  // pointed at the right one.
  if (name.includes('domain') || name.includes('from_address')) {
    return 'invalid_sender';
  }
  if (status === 401 || status === 403 || name.includes('api_key')) {
    return 'unauthorized';
  }
  if (status === 429 || name.includes('rate_limit')) return 'rate_limited';
  if (name.includes('recipient') || name.includes('to_address')) {
    return 'invalid_recipient';
  }
  if (name === 'validation_error' || status === 422) return 'invalid_sender';
  if (typeof status === 'number' && status >= 500) return 'provider_error';
  return 'unknown';
}

/**
 * Production transactional email via the Resend API.
 *
 * Content is supplied by the caller (see mail/templates) — this adapter only
 * transports it, so swapping providers means writing a sibling adapter and
 * changing one binding in AuthModule. Nothing in AuthService changes.
 */
@Injectable()
export class ResendMailAdapter implements MailService {
  private readonly logger = new Logger(ResendMailAdapter.name);

  constructor(
    private readonly client: Pick<Resend, 'emails'>,
    private readonly from: string,
  ) {}

  async send(options: SendEmailOptions): Promise<void> {
    // Subject and recipient only. The body carries reset and verification
    // tokens and is never logged, here or anywhere else in this class.
    this.logger.log(
      `EMAIL_SEND_ATTEMPT provider=resend to=${options.to} subject="${options.subject}"`,
    );

    let result: Awaited<ReturnType<Resend['emails']['send']>>;
    try {
      result = await this.client.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        // Resend accepts html and text together and negotiates on the
        // recipient's client; text alone is still a valid message.
        ...(options.html ? { html: options.html } : {}),
      });
    } catch (error) {
      // Thrown errors are transport-level (DNS, socket, timeout). The message
      // is kept for diagnosis; an API key is never part of it.
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(
        `EMAIL_SEND_FAILURE provider=resend to=${options.to} category=network_error reason="${message}"`,
      );
      throw new MailDeliveryError(
        'network_error',
        `Could not reach the email provider: ${message}`,
      );
    }

    if (result.error) {
      const category = categorize(result.error as ResendErrorLike);
      this.logger.error(
        `EMAIL_SEND_FAILURE provider=resend to=${options.to} category=${category} providerError="${result.error.name ?? 'unknown'}"`,
      );
      throw new MailDeliveryError(
        category,
        `Email provider rejected the message (${category}).`,
      );
    }

    this.logger.log(
      `EMAIL_SEND_SUCCESS provider=resend to=${options.to} messageId=${result.data?.id ?? 'unknown'}`,
    );
  }
}
