import { Injectable } from '@nestjs/common';
import type { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type RecordAuditEntryInput = {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  actorId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ipAddress?: string;
};

// Append-only by convention: this service only ever creates AuditLog rows,
// never updates or deletes them (see plan's Security Rules — "protect audit
// records from ordinary user modification"). No update/delete method exists
// here on purpose.
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: RecordAuditEntryInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorId: entry.actorId,
        before: entry.before,
        after: entry.after,
        ipAddress: entry.ipAddress,
      },
    });
  }
}
