import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { verifyOAuthState } from '../oauth-state.util';
import { clearOAuthStateCookie } from '../cookie.util';
import { COOKIE_NAMES } from '../auth.constants';

// Validates the OAuth CSRF state BEFORE Passport exchanges the authorization
// code with Google, so a forged, expired, or replayed `state` never reaches
// a real token exchange. See GoogleOAuthGuard for where the state is issued
// and oauth-state.util.ts for the signing/verification scheme.
@Injectable()
export class GoogleOAuthCallbackGuard extends AuthGuard('google') {
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

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const cookieState = req.cookies?.[COOKIE_NAMES.OAUTH_STATE] as
      string | undefined;
    const queryState =
      typeof req.query.state === 'string' ? req.query.state : undefined;

    // One-time use regardless of outcome: a state value must never be
    // presentable a second time, whether this check passes or fails.
    clearOAuthStateCookie(res);

    const secret = this.config.getOrThrow<string>('SESSION_COOKIE_SECRET');
    if (!verifyOAuthState(cookieState, queryState, secret)) {
      throw new UnauthorizedException('Invalid or expired sign-in request');
    }

    return super.canActivate(context);
  }
}
