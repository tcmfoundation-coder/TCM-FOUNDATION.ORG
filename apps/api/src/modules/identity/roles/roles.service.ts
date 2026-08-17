import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PrivilegedRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { MfaService } from '../auth/mfa.service';
import { PENDING_ROLE_EXPIRY_MS } from '../auth/auth.constants';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mfa: MfaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * A PENDING_MFA grant left unconfirmed past PENDING_ROLE_EXPIRY_MS can
   * never activate itself — lazily flips it to EXPIRED on read (no cron
   * needed) so both the account holder and admin views see accurate status,
   * and verifyMfaEnrollment below won't silently activate a stale grant.
   */
  private async expireStalePendingRoles(userId: string): Promise<void> {
    const cutoff = new Date(Date.now() - PENDING_ROLE_EXPIRY_MS);
    const stale = await this.prisma.userRole.findMany({
      where: { userId, status: 'PENDING_MFA', assignedAt: { lt: cutoff } },
    });

    if (stale.length === 0) return;

    await this.prisma.userRole.updateMany({
      where: { id: { in: stale.map((r) => r.id) } },
      data: { status: 'EXPIRED' },
    });

    for (const role of stale) {
      await this.audit.record({
        action: 'ROLE_ASSIGNMENT_EXPIRED',
        entityType: 'UserRole',
        entityId: role.id,
        after: { role: role.role, status: 'EXPIRED' },
      });
    }
  }

  async getMyRoles(userId: string) {
    await this.expireStalePendingRoles(userId);

    const [user, roles] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, email: true, mfaEnabled: true, mfaEnrolledAt: true },
      }),
      this.prisma.userRole.findMany({
        where: { userId },
        select: {
          role: true,
          status: true,
          assignedAt: true,
          activatedAt: true,
        },
      }),
    ]);

    return {
      id: user.id,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
      mfaEnrolledAt: user.mfaEnrolledAt,
      roles,
    };
  }

  async setupMfa(userId: string, email: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled for this account');
    }

    const secret = this.mfa.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecretEncrypted: this.mfa.encryptSecret(secret) },
    });

    return { secret, otpauthUri: this.mfa.buildOtpAuthUri(email, secret) };
  }

  /**
   * Confirms TOTP enrollment. On success, every role this user was
   * assigned but couldn't use yet (PENDING_MFA) activates immediately —
   * this is the one and only path by which a UserRole reaches ACTIVE,
   * per the plan's Authentication & Authorization Model.
   */
  async verifyMfaEnrollment(userId: string, code: string) {
    await this.expireStalePendingRoles(userId);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.mfaSecretEncrypted) {
      throw new BadRequestException('Call POST /roles/mfa/setup first');
    }

    this.mfa.assertNotLocked(user);

    const secret = this.mfa.decryptSecret(user.mfaSecretEncrypted);
    if (!(await this.mfa.verifyCode(code, secret))) {
      await this.mfa.registerFailedAttempt(userId);
      await this.audit.record({
        action: 'MFA_VERIFICATION_FAILED',
        entityType: 'User',
        entityId: userId,
        actorId: userId,
      });
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.mfa.registerSuccess(userId);
    await this.audit.record({
      action: 'MFA_VERIFICATION_SUCCEEDED',
      entityType: 'User',
      entityId: userId,
      actorId: userId,
    });

    const pendingRoles = await this.prisma.userRole.findMany({
      where: { userId, status: 'PENDING_MFA' },
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true, mfaEnrolledAt: new Date() },
      }),
      this.prisma.userRole.updateMany({
        where: { userId, status: 'PENDING_MFA' },
        data: { status: 'ACTIVE', activatedAt: new Date() },
      }),
    ]);

    for (const pending of pendingRoles) {
      await this.audit.record({
        action: 'ROLE_ACTIVATED',
        entityType: 'UserRole',
        entityId: pending.id,
        actorId: userId,
        after: { role: pending.role, status: 'ACTIVE' },
      });
    }

    return { success: true, activatedRoles: pendingRoles.map((r) => r.role) };
  }

  async assignRole(
    actorId: string,
    targetUserId: string,
    role: PrivilegedRole,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.userRole.findUnique({
      where: { userId_role: { userId: targetUserId, role } },
    });

    if (
      existing &&
      existing.status !== 'REVOKED' &&
      existing.status !== 'EXPIRED'
    ) {
      throw new BadRequestException(
        `User already has an active or pending ${role} role`,
      );
    }

    // If the account already completed MFA enrollment (from a prior role),
    // there's no need to re-verify a second factor that already exists —
    // the new role activates immediately. Otherwise it starts PENDING_MFA.
    const activateImmediately = targetUser.mfaEnabled;
    const now = new Date();

    const userRole = existing
      ? await this.prisma.userRole.update({
          where: { id: existing.id },
          data: {
            status: activateImmediately ? 'ACTIVE' : 'PENDING_MFA',
            assignedById: actorId,
            assignedAt: now,
            activatedAt: activateImmediately ? now : null,
            revokedAt: null,
          },
        })
      : await this.prisma.userRole.create({
          data: {
            userId: targetUserId,
            role,
            status: activateImmediately ? 'ACTIVE' : 'PENDING_MFA',
            assignedById: actorId,
            activatedAt: activateImmediately ? now : null,
          },
        });

    await this.audit.record({
      action: 'ROLE_ASSIGNED',
      entityType: 'UserRole',
      entityId: userRole.id,
      actorId,
      after: { userId: targetUserId, role, status: userRole.status },
    });

    if (activateImmediately) {
      await this.audit.record({
        action: 'ROLE_ACTIVATED',
        entityType: 'UserRole',
        entityId: userRole.id,
        actorId,
        after: { role, status: 'ACTIVE' },
      });
    }

    return userRole;
  }

  async revokeRole(
    actorId: string,
    targetUserId: string,
    role: PrivilegedRole,
  ) {
    const existing = await this.prisma.userRole.findUnique({
      where: { userId_role: { userId: targetUserId, role } },
    });

    if (!existing || existing.status === 'REVOKED') {
      throw new NotFoundException('Role assignment not found');
    }

    const userRole = await this.prisma.userRole.update({
      where: { id: existing.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    await this.audit.record({
      action: 'ROLE_REVOKED',
      entityType: 'UserRole',
      entityId: userRole.id,
      actorId,
      before: { role, status: existing.status },
      after: { role, status: 'REVOKED' },
    });

    return userRole;
  }
}
