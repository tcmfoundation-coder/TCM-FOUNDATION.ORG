import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Cloudflare's siteverify is normally single-digit milliseconds. A ceiling
// well above that keeps a slow-but-working response from being discarded,
// while still bounding how long a public form submission can hang.
const VERIFY_TIMEOUT_MS = 5000;

export type TurnstileOutcome =
  | { status: 'skipped' }
  | { status: 'valid' }
  | { status: 'missing-token' }
  | { status: 'invalid'; codes: string[] }
  | { status: 'unavailable'; reason: string };

interface SiteVerifyResponse {
  success?: boolean;
  'error-codes'?: string[];
}

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Turnstile is only enforced once a secret is actually configured. That
   * keeps local development, the e2e suite, and any environment the client
   * has not yet issued keys for working unchanged — while making enforcement
   * automatic the moment the secret lands in the environment.
   */
  isEnabled(): boolean {
    return Boolean(this.config.get<string>('TURNSTILE_SECRET_KEY'));
  }

  async verify(token: unknown, remoteIp?: string): Promise<TurnstileOutcome> {
    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret) return { status: 'skipped' };

    if (typeof token !== 'string' || token.trim() === '') {
      return { status: 'missing-token' };
    }

    // Cloudflare expects form encoding, not JSON.
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    let response: Response;
    try {
      response = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      });
    } catch (error) {
      // Never logs `secret` or `token` — only why the call failed.
      const reason =
        error instanceof Error && error.name === 'TimeoutError'
          ? 'timed out'
          : 'network error';
      this.logger.error(`Turnstile verification ${reason}`);
      return { status: 'unavailable', reason };
    }

    if (!response.ok) {
      this.logger.error(
        `Turnstile verification returned HTTP ${response.status}`,
      );
      return { status: 'unavailable', reason: `HTTP ${response.status}` };
    }

    const result = (await response.json()) as SiteVerifyResponse;
    if (result.success === true) return { status: 'valid' };

    return { status: 'invalid', codes: result['error-codes'] ?? [] };
  }
}
