import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TurnstileService } from './turnstile.service';

/**
 * Applied to the public, unauthenticated write endpoints (contact, newsletter,
 * Support Lab, application submissions). Verification happens here on the
 * server — a token in the request body is treated as a claim to be checked
 * against Cloudflare, never as proof on its own.
 *
 * Guards run before the global ValidationPipe, so the raw body is read here.
 * Each protected DTO also declares `turnstileToken` so `forbidNonWhitelisted`
 * does not reject the field once the pipe runs.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private readonly turnstile: TurnstileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = (request.body ?? {}) as Record<string, unknown>;

    const outcome = await this.turnstile.verify(
      body.turnstileToken,
      request.ip,
    );

    switch (outcome.status) {
      case 'skipped':
      case 'valid':
        return true;
      case 'missing-token':
        throw new BadRequestException(
          'Please complete the verification challenge and try again.',
        );
      case 'invalid':
        throw new BadRequestException(
          'Verification failed. Please try the challenge again.',
        );
      case 'unavailable':
        // Fail closed: with the challenge unverifiable we cannot tell a real
        // visitor from a bot, and these endpoints all write to tables staff
        // read. The message tells the visitor this is transient.
        throw new ServiceUnavailableException(
          'We could not verify your submission right now. Please try again in a moment.',
        );
    }
  }
}
