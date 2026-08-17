import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TokenService } from '../token.service';
import { COOKIE_NAMES } from '../auth.constants';

export type AuthenticatedUser = {
  id: string;
  email: string;
  mfaEnabled: boolean;
};

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

// The only place an access token is trusted to mean "this request is from
// this user." Authorization (which roles that user currently holds) is a
// separate, always-fresh DB check in RolesGuard — never inferred from the
// token itself, so a revoked role takes effect immediately, not just after
// the access token's 15-minute expiry.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token: unknown = request.cookies?.[COOKIE_NAMES.ACCESS];

    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException('Not authenticated');
    }

    const payload = this.tokens.verifyAccessToken(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, mfaEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    request.user = user;
    return true;
  }
}
