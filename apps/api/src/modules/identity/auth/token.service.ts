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
   *
   * No tolerance window here, deliberately. An earlier version of this
   * method tried to except "two genuinely concurrent legitimate callers
   * from the same browser" (proxy.ts's own refresh racing the browser's)
   * from that rule, on the theory that a live successor token created in
   * the same instant proves the revocation was an ordinary rotation, not a
   * security nuke. That theory was wrong: an ORDINARY rotation always,
   * unconditionally, creates exactly that live successor as part of
   * rotating — so the same signal is produced by a straightforward replay
   * of the just-rotated token moments later, which is exactly the case
   * reuse detection exists to catch. CI's own e2e suite caught this
   * (auth.e2e-spec.ts's rotate-then-replay-the-original test) before it
   * shipped. The concurrent-caller race this was trying to fix is real
   * (see proxy.ts's refreshAdminSession doc comment) but is not solvable by
   * any signal available at this layer — closing it needs either routing
   * proxy's refresh through the browser's own single-flight mechanism
   * instead of a second independent caller, or a real parent/child link
   * between a token and its successor (schema change), neither of which
   * belongs in a fix for the original session-expiration bug. Left as a
   * known, narrow limitation: the affected case (a client fetch already in
   * flight at the exact moment a fresh /admin/* navigation also needs to
   * refresh) forces a re-login — the same outcome every access-token
   * expiry produced before this file's other fix, not a new failure mode.
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

    await this.prisma.refreshToken.update({
      where: { id: payload.jti },
      data: { revokedAt: new Date() },
    });

    return this.issueFreshPairFor(payload.sub);
  }

  /**
   * Deactivation check + issuing a brand-new access/refresh pair — pulled
   * out of rotateRefreshToken purely so signing the access token and
   * issuing the refresh token read the same regardless of which caller
   * needed them.
   */
  private async issueFreshPairFor(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
    // Checked on every rotation: a deactivated account must not be able to
    // trade a valid 30-day refresh token for a fresh access token and
    // quietly keep its session alive.
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deactivatedAt: true },
    });
    if (!owner || owner.deactivatedAt) {
      await this.revokeAllForUser(userId);
      throw new UnauthorizedException('Invalid or expired session');
    }

    const [accessToken, refreshToken] = await Promise.all([
      Promise.resolve(this.signAccessToken(userId)),
      this.issueRefreshToken(userId),
    ]);

    return { accessToken, refreshToken, userId };
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
