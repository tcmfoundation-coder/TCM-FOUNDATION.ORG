import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import type { Response } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';
import { MAIL_SERVICE, type MailService } from './mail/mail.service';
import { generateRandomToken, hashToken } from './crypto.util';
import {
  setAuthCookies,
  setMfaPendingCookie,
  clearAuthCookies,
} from './cookie.util';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  MFA_PENDING_TOKEN_TTL_SECONDS,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
} from './auth.constants';
import type { GoogleProfile } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mfa: MfaService,
    private readonly config: ConfigService,
    private readonly audit: AuditLogService,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {}

  private async issueSession(userId: string, res: Response): Promise<void> {
    const accessToken = this.tokens.signAccessToken(userId);
    const refreshToken = await this.tokens.issueRefreshToken(userId);
    setAuthCookies(
      res,
      { accessToken, refreshToken },
      {
        accessTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
        refreshTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
      },
    );
  }

  /** Password login, step 1. Returns whether a second (TOTP) factor is required. */
  async login(
    email: string,
    password: string,
    res: Response,
    ipAddress?: string,
  ): Promise<{ mfaRequired: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Same generic error whether the account doesn't exist or the password
    // is wrong — never reveal which, that's a user-enumeration leak.
    if (
      !user ||
      !user.passwordHash ||
      !(await argon2.verify(user.passwordHash, password))
    ) {
      await this.audit.record({
        action: 'ADMIN_LOGIN_FAILED',
        entityType: 'User',
        entityId: user?.id,
        after: { email },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.mfaEnabled) {
      const pendingToken = this.tokens.signMfaPendingToken(user.id);
      setMfaPendingCookie(res, pendingToken, MFA_PENDING_TOKEN_TTL_SECONDS);
      return { mfaRequired: true };
    }

    await this.issueSession(user.id, res);
    await this.audit.record({
      action: 'ADMIN_LOGIN_SUCCEEDED',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      ipAddress,
    });
    return { mfaRequired: false };
  }

  /** Password login, step 2 (only for accounts with MFA already enabled). */
  async completeMfaLogin(
    userId: string,
    code: string,
    res: Response,
    ipAddress?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new UnauthorizedException('MFA is not enabled for this account');
    }

    this.mfa.assertNotLocked(user);

    const secret = this.mfa.decryptSecret(user.mfaSecretEncrypted);
    if (!(await this.mfa.verifyCode(code, secret))) {
      await this.mfa.registerFailedAttempt(user.id);
      await this.audit.record({
        action: 'MFA_VERIFICATION_FAILED',
        entityType: 'User',
        entityId: user.id,
        actorId: user.id,
        ipAddress,
      });
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.mfa.registerSuccess(user.id);
    await this.issueSession(user.id, res);
    await this.audit.record({
      action: 'MFA_VERIFICATION_SUCCEEDED',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      ipAddress,
    });
    await this.audit.record({
      action: 'ADMIN_LOGIN_SUCCEEDED',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      ipAddress,
    });
  }

  /**
   * Google OAuth login. Deliberately does NOT auto-create an account —
   * this is a closed staff system (deny-by-default), so a Google identity
   * with no matching TCM account is rejected rather than silently
   * provisioned. Accounts are created via UsersModule by a Super
   * Administrator; a user who already has a password-based account can
   * link Google to it by matching on email.
   */
  async loginWithGoogle(
    profile: GoogleProfile,
    res: Response,
    ipAddress?: string,
  ): Promise<{ mfaRequired: boolean }> {
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });
      if (!user) {
        await this.audit.record({
          action: 'ADMIN_LOGIN_FAILED',
          entityType: 'User',
          after: { email: profile.email, method: 'google' },
          ipAddress,
        });
        throw new UnauthorizedException(
          'No TCM Foundation account is linked to this Google account. Ask a Super Administrator to create one first.',
        );
      }
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
      });
    }

    if (user.mfaEnabled) {
      const pendingToken = this.tokens.signMfaPendingToken(user.id);
      setMfaPendingCookie(res, pendingToken, MFA_PENDING_TOKEN_TTL_SECONDS);
      return { mfaRequired: true };
    }

    await this.issueSession(user.id, res);
    await this.audit.record({
      action: 'ADMIN_LOGIN_SUCCEEDED',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      after: { method: 'google' },
      ipAddress,
    });
    return { mfaRequired: false };
  }

  async refresh(refreshTokenCookie: string, res: Response): Promise<void> {
    const { accessToken, refreshToken } =
      await this.tokens.rotateRefreshToken(refreshTokenCookie);
    setAuthCookies(
      res,
      { accessToken, refreshToken },
      {
        accessTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
        refreshTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
      },
    );
  }

  async logout(
    refreshTokenCookie: string | undefined,
    res: Response,
    ipAddress?: string,
  ): Promise<void> {
    if (refreshTokenCookie) {
      const userId = await this.tokens.revokeRefreshToken(refreshTokenCookie);
      if (userId) {
        await this.audit.record({
          action: 'ADMIN_LOGOUT',
          entityType: 'User',
          entityId: userId,
          actorId: userId,
          ipAddress,
        });
      }
    }
    clearAuthCookies(res);
  }

  /** Called by UsersService right after a Super Administrator creates an account. */
  async sendEmailVerification(userId: string, email: string): Promise<void> {
    const rawToken = generateRandomToken();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: hashToken(rawToken),
        emailVerificationExpiresAt: new Date(
          Date.now() + EMAIL_VERIFICATION_TTL_MS,
        ),
      },
    });

    const verifyUrl = `${this.config.get<string>('APP_BASE_URL') ?? 'http://localhost:3000'}/admin/verify-email?token=${rawToken}`;
    await this.mail.send({
      to: email,
      subject: 'Verify your TCM Foundation account email',
      text: `Verify your email: ${verifyUrl}\nThis link expires in 24 hours.`,
    });
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: hashToken(rawToken) },
    });

    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return; // never reveal whether an account exists

    const rawToken = generateRandomToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashToken(rawToken),
        passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    const resetUrl = `${this.config.get<string>('APP_BASE_URL') ?? 'http://localhost:3000'}/admin/reset-password?token=${rawToken}`;
    await this.mail.send({
      to: email,
      subject: 'Reset your TCM Foundation password',
      text: `Reset your password: ${resetUrl}\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: hashToken(rawToken) },
    });

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    // A password reset invalidates every existing session, not just the
    // device the reset happened on — the old password may have been
    // compromised, which is the whole reason a reset was requested.
    await this.tokens.revokeAllForUser(user.id);
  }
}
