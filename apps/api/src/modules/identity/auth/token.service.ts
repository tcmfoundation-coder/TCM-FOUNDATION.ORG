import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  MFA_PENDING_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants';
import { hashToken } from './crypto.util';

type AccessTokenPayload = { sub: string; type: 'access' };
type MfaPendingPayload = { sub: string; type: 'mfa_pending' };
type RefreshTokenPayload = { sub: string; type: 'refresh'; jti: string };

// Issues and verifies every JWT in the system, and owns refresh-token
// rotation against the RefreshToken table. Access/MFA-pending tokens are
// self-verifying (short-lived, stateless); refresh tokens are additionally
// checked against the DB so they can be revoked before their natural
// expiry (logout, password reset, reuse detection).
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(userId: string): string {
    const payload: AccessTokenPayload = { sub: userId, type: 'access' };
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== 'access') throw new Error('wrong token type');
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  signMfaPendingToken(userId: string): string {
    const payload: MfaPendingPayload = { sub: userId, type: 'mfa_pending' };
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: MFA_PENDING_TOKEN_TTL_SECONDS,
    });
  }

  verifyMfaPendingToken(token: string): MfaPendingPayload {
    try {
      const payload = this.jwt.verify<MfaPendingPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== 'mfa_pending') throw new Error('wrong token type');
      return payload;
    } catch {
      throw new UnauthorizedException(
        'MFA challenge expired — please log in again',
      );
    }
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const jti = randomUUID();
    const payload: RefreshTokenPayload = { sub: userId, type: 'refresh', jti };
    const token = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    });

    return token;
  }

  /**
   * Verifies + rotates a refresh token: the presented token is revoked and
   * a new access/refresh pair is issued. If a token that's already revoked
   * is presented again, that is treated as reuse of a stolen token — every
   * refresh token for that user is revoked and the caller must re-login.
   */
  async rotateRefreshToken(
    presentedToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwt.verify<RefreshTokenPayload>(presentedToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      if (payload.type !== 'refresh') throw new Error('wrong token type');
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (!stored || stored.tokenHash !== hashToken(presentedToken)) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (stored.revokedAt) {
      await this.revokeAllForUser(payload.sub);
      throw new UnauthorizedException('Session revoked — please log in again');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Checked before the token is rotated: a deactivated account must not be
    // able to trade a valid 30-day refresh token for a fresh access token and
    // quietly keep its session alive.
    const owner = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { deactivatedAt: true },
    });
    if (!owner || owner.deactivatedAt) {
      await this.revokeAllForUser(payload.sub);
      throw new UnauthorizedException('Invalid or expired session');
    }

    await this.prisma.refreshToken.update({
      where: { id: payload.jti },
      data: { revokedAt: new Date() },
    });

    const [accessToken, refreshToken] = await Promise.all([
      Promise.resolve(this.signAccessToken(payload.sub)),
      this.issueRefreshToken(payload.sub),
    ]);

    return { accessToken, refreshToken, userId: payload.sub };
  }

  /** Returns the token's owning userId (for audit logging) if it was valid, else undefined. */
  async revokeRefreshToken(
    presentedToken: string,
  ): Promise<string | undefined> {
    try {
      const payload = this.jwt.verify<RefreshTokenPayload>(presentedToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return payload.sub;
    } catch {
      // Already invalid/expired — nothing to revoke, logout still succeeds.
      return undefined;
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
