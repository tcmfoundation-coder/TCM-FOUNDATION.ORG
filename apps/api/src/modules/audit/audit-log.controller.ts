import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PrivilegedRole } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/auth/guards/roles.guard';
import { Roles } from '../identity/auth/decorators/roles.decorator';

// Read-only: audit records contain admin-login, role-change, and
// authorization-denial history, so this is restricted to
// SUPER_ADMINISTRATOR — the same tier that can assign/revoke roles
// (roles.controller.ts) — not to CONTENT_EDITOR/ADMINISTRATOR.
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PrivilegedRole.SUPER_ADMINISTRATOR)
export class AuditLogController {
  constructor(private readonly auditLogs: AuditLogService) {}

  @Get()
  list(@Query() query: ListAuditLogsDto) {
    return this.auditLogs.list(query.skip, query.take, {
      action: query.action,
      entityType: query.entityType,
      actorId: query.actorId,
    });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.auditLogs.getById(id);
  }
}
