import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { PrivilegedRole } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../../audit/audit-log.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Must run after JwtAuthGuard (needs request.user). Deliberately queries
// the DB on every request instead of trusting roles embedded in the access
// token, so a role revoked mid-session is denied on the very next request —
// not just once the (short-lived) access token happens to expire.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<PrivilegedRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Not authorized');
    }

    const activeRole = await this.prisma.userRole.findFirst({
      where: { userId, role: { in: requiredRoles }, status: 'ACTIVE' },
    });

    if (!activeRole) {
      // A genuine authorization failure by an identified, authenticated
      // user — distinct from JwtAuthGuard's plain "not logged in" 401s,
      // which aren't logged here to avoid flooding the audit trail with
      // anonymous traffic noise.
      await this.audit.record({
        action: 'AUTHORIZATION_DENIED',
        entityType: 'Route',
        entityId: request.path,
        actorId: userId,
        after: { requiredRoles },
        ipAddress: request.ip,
      });
      throw new ForbiddenException('Not authorized');
    }

    return true;
  }
}
