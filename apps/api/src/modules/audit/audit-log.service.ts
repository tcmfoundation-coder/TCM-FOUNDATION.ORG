import { Injectable, NotFoundException } from '@nestjs/common';
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

export type ListAuditLogsFilter = {
  action?: AuditAction;
  entityType?: string;
  actorId?: string;
};

// Narrow, explicit select for the actor relation — never `include`, so a
// new sensitive column added to User later (password hash, MFA secret,
// tokens) isn't silently exposed through the audit trail.
const ACTOR_SELECT = {
  id: true,
  email: true,
} as const;

const SELECT = {
  id: true,
  actorId: true,
  actor: { select: ACTOR_SELECT },
  action: true,
  entityType: true,
  entityId: true,
  before: true,
  after: true,
  ipAddress: true,
  createdAt: true,
} as const;

// Append-only by convention: this service only ever creates AuditLog rows,
// never updates or deletes them (see plan's Security Rules — "protect audit
// records from ordinary user modification"). No update/delete method exists
// here on purpose. list()/getById() are read-only and don't compromise that.
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

  async list(skip: number, take: number, filter: ListAuditLogsFilter = {}) {
    const where: Prisma.AuditLogWhereInput = {
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
      ...(filter.actorId ? { actorId: filter.actorId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async getById(id: string) {
    const entry = await this.prisma.auditLog.findUnique({
      where: { id },
      select: SELECT,
    });
    if (!entry) throw new NotFoundException('Audit log entry not found');
    return entry;
  }
}
