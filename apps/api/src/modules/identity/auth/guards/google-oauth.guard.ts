import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { generateOAuthState } from '../oauth-state.util';
import { setOAuthStateCookie } from '../cookie.util';
import { OAUTH_STATE_TTL_SECONDS } from '../auth.constants';

// Wraps AuthGuard('google') with a config check so an unconfigured
// environment returns a clear 503 instead of passport's generic
// "Unknown authentication strategy" error (which is what happens if the
// 'google' strategy was never registered — see AuthModule).
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (
      !this.config.get('GOOGLE_OAUTH_CLIENT_ID') ||
      !this.config.get('GOOGLE_OAUTH_CLIENT_SECRET')
    ) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured yet',
      );
    }
    return super.canActivate(context);
  }

  // Issues this flow's CSRF state: a signed, short-lived value handed to
  // Google as the `state` param and also stashed in an httpOnly cookie, so
  // GoogleOAuthCallbackGuard can require the two to match byte-for-byte.
  // See oauth-state.util.ts for why a server-side session isn't needed here.
  getAuthenticateOptions(context: ExecutionContext) {
    const res = context.switchToHttp().getResponse<Response>();
    const state = generateOAuthState(
      this.config.getOrThrow<string>('SESSION_COOKIE_SECRET'),
    );
    setOAuthStateCookie(res, state, OAUTH_STATE_TTL_SECONDS);
    return { state };
  }
}
