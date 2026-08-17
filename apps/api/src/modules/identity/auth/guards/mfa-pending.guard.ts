import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../token.service';
import { COOKIE_NAMES } from '../auth.constants';

declare module 'express' {
  interface Request {
    mfaPendingUserId?: string;
  }
}

// Gates POST /auth/mfa/login-verify — only a holder of a short-lived
// mfa_pending cookie (issued by /auth/login after a correct password, for
// an account with MFA already enabled) may attempt a TOTP code here.
@Injectable()
export class MfaPendingGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token: unknown = request.cookies?.[COOKIE_NAMES.MFA_PENDING];

    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException(
        'No pending MFA challenge — please log in again',
      );
    }

    const payload = this.tokens.verifyMfaPendingToken(token);
    request.mfaPendingUserId = payload.sub;
    return true;
  }
}
