import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  MFA_PENDING_TOKEN_TTL_SECONDS,
  REFRESH_REUSE_GRACE_MS,
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
   * hasLegitimateConcurrentSuccessor is the one deliberate exception to that:
   * two genuinely concurrent, legitimate callers from the SAME browser — the
   * proxy-level refresh in proxy.ts (fired for a stale /admin/* navigation)
   * and the browser's own single-flight refresh in api-client.ts (fired by
   * an already-mounted page's request) — can both present the one token that
   * just expired within milliseconds of each other. Whichever loses that
   * race used to be treated as a thief and had `revokeAllForUser` pull the
   * winner's brand-new session out from under it too, seconds after login —
   * reproduced live by clearing just the access_token cookie and reloading
   * an admin page with a second in-flight request already running.
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
      if (
        await this.hasLegitimateConcurrentSuccessor(
          payload.sub,
          stored.revokedAt,
        )
      ) {
        return this.issueFreshPairFor(payload.sub);
      }
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
   * True only when this revoked token's revocation looks like an ordinary
   * single-token rotation that this same instant produced a live successor
   * for — never true for a security nuke (revokeAllForUser, used for reuse
   * detection, logout, and deactivation), which revokes without ever
   * issuing anything, so it never has one.
   *
   * This is what actually distinguishes "two legitimate concurrent callers
   * raced on one rotation" from "this token was just nuked, and the caller
   * presenting it again moments later is the thief the nuke exists to stop"
   * — both leave `revokedAt` set to "now" indistinguishably, so a bare time
   * check on `revokedAt` alone (an earlier version of this method) would
   * have handed the just-nuked token's holder a fresh session too. A live
   * token created within the same narrow window is strong evidence of the
   * former: `revokeAllForUser` creates nothing, so unless this user's other
   * session(s) coincidentally rotated in the same instant — no likelier than
   * the false positive this method exists to prevent — this only fires for
   * an actual rotation.
   */
  private async hasLegitimateConcurrentSuccessor(
    userId: string,
    revokedAt: Date,
  ): Promise<boolean> {
    if (Date.now() - revokedAt.getTime() > REFRESH_REUSE_GRACE_MS) return false;

    const successor = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        revokedAt: null,
        createdAt: {
          gte: new Date(revokedAt.getTime() - REFRESH_REUSE_GRACE_MS),
          lte: new Date(revokedAt.getTime() + REFRESH_REUSE_GRACE_MS),
        },
      },
      select: { id: true },
    });
    return successor !== null;
  }

  /**
   * Deactivation check + issuing a brand-new access/refresh pair — shared by
   * the normal rotation path and the narrow concurrent-caller grace window
   * above. Never touches the PRESENTED token's own row: the caller is
   * responsible for that (already revoked in the normal path; already
   * revoked by the winning caller in the grace-window path).
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
