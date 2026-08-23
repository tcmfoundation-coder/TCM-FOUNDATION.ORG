import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RolesService } from '../roles/roles.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';

// Never select passwordHash, mfaSecretEncrypted, or any reset/verification
// token on a response path — those never leave the server.
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  emailVerifiedAt: true,
  mfaEnabled: true,
  deactivatedAt: true,
  createdAt: true,
  roles: {
    select: { role: true, status: true, assignedAt: true, activatedAt: true },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly roles: RolesService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Creates a staff account.
   *
   * The previous version committed the user, committed the role, and then
   * awaited the verification email — so when delivery failed (which it always
   * does in production while EMAIL_PROVIDER is unset) the request 500'd with a
   * fully-created account already in the database. The admin saw a failure,
   * retried, and got "a user with this email already exists". That is the bug.
   *
   * Two rules now hold:
   *
   * 1. The account and its role are created in ONE transaction, so there is no
   *    state where a user exists without the role that was asked for.
   * 2. Email delivery happens AFTER that transaction commits and can never
   *    undo it. Sending mail is an external HTTP call; holding a Postgres
   *    transaction open across it would keep row locks for the length of an
   *    unbounded network round trip, and a Resend timeout would destroy a
   *    perfectly good account.
   *
   * Delivery failure is therefore reported rather than hidden: the response
   * carries `emailDelivered`, so the caller can tell the admin plainly that
   * the account exists but the invitation did not go out. It is not silent
   * success, and it is not a rollback of valid work. The account is usable
   * immediately because login does not require a verified email - the admin
   * hands over the temporary password out of band.
   *
   * Retrying with the same address is deterministic: the duplicate check
   * rejects it instead of producing a second account.
   */
  async createStaffUser(actorId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.temporaryPassword);

    // Atomic: either both rows land or neither does.
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: dto.email, passwordHash },
        select: { id: true, email: true },
      });

      if (dto.initialRole) {
        // Mirrors RolesService.assignRole for the new-account case, which is
        // the only case reachable here: no prior role row exists, and
        // mfaEnabled is false on a fresh user, so the assignment starts
        // PENDING_MFA exactly as it would there.
        await tx.userRole.create({
          data: {
            userId: user.id,
            role: dto.initialRole,
            status: 'PENDING_MFA',
            assignedById: actorId,
          },
        });
      }

      return user;
    });

    await this.audit.record({
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: created.id,
      actorId,
      after: { email: created.email, initialRole: dto.initialRole ?? null },
    });

    let emailDelivered = true;
    try {
      await this.auth.sendEmailVerification(created.id, created.email);
    } catch {
      // The account stands. Only the notification failed, and the admin is
      // told so by the flag below rather than by a 500 that hides a
      // successful creation. The error body is deliberately not surfaced:
      // it can name the provider and its configuration.
      emailDelivered = false;
    }

    return { ...(await this.getById(created.id)), emailDelivered };
  }

  /**
   * Soft-deletes a staff account.
   *
   * The row survives because AuditLog references actors by id: hard deletion
   * would either orphan that history or cascade it away, and an audit trail
   * that disappears when someone is removed is not an audit trail.
   *
   * Access ends immediately rather than at the next token expiry. Three
   * independent points enforce it, so no single missed check leaves a way in:
   * JwtAuthGuard rejects every request from a deactivated user, login refuses
   * them at the door, and refresh refuses to trade their 30-day refresh token
   * for a new session. Their outstanding refresh tokens are revoked here too,
   * so nothing survives to be replayed.
   */
  async deactivate(actorId: string, targetUserId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, deactivatedAt: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    // Locking yourself out is almost never intended and is tedious to undo,
    // since it can leave nobody able to reverse it.
    if (targetUserId === actorId) {
      throw new BadRequestException(
        'You cannot deactivate your own account. Ask another Super Administrator.',
      );
    }

    // Idempotent: repeating the call is not an error, and it must not write a
    // second audit entry implying it happened twice.
    if (target.deactivatedAt) {
      return this.getById(targetUserId);
    }

    // The system must never be left with no one who can administer it.
    const otherActiveSuperAdmins = await this.prisma.userRole.count({
      where: {
        role: 'SUPER_ADMINISTRATOR',
        status: 'ACTIVE',
        userId: { not: targetUserId },
        user: { deactivatedAt: null },
      },
    });
    const targetIsSuperAdmin = await this.prisma.userRole.findFirst({
      where: {
        userId: targetUserId,
        role: 'SUPER_ADMINISTRATOR',
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (targetIsSuperAdmin && otherActiveSuperAdmins === 0) {
      throw new BadRequestException(
        'This is the last active Super Administrator. Assign another before deactivating this account.',
      );
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { deactivatedAt: now },
      }),
      // Kill outstanding sessions in the same commit, so there is no window
      // where the account is deactivated but a refresh token still works.
      this.prisma.refreshToken.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    await this.audit.record({
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: targetUserId,
      actorId,
      before: { deactivatedAt: null },
      after: { deactivatedAt: now.toISOString(), email: target.email },
    });

    return this.getById(targetUserId);
  }

  /** Restores a soft-deleted account. Roles keep whatever status they had. */
  async reactivate(actorId: string, targetUserId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, deactivatedAt: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (!target.deactivatedAt) {
      return this.getById(targetUserId);
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { deactivatedAt: null },
    });

    await this.audit.record({
      action: 'USER_REACTIVATED',
      entityType: 'User',
      entityId: targetUserId,
      actorId,
      before: { deactivatedAt: target.deactivatedAt.toISOString() },
      after: { deactivatedAt: null, email: target.email },
    });

    return this.getById(targetUserId);
  }

  async listStaff(skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count(),
    ]);

    return { items, total, skip, take };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
