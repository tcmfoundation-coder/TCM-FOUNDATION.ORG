import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateImpactStatDto } from './dto/create-impact-stat.dto';
import { UpdateImpactStatDto } from './dto/update-impact-stat.dto';

const PUBLIC_SELECT = {
  id: true,
  label: true,
  value: true,
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  order: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ImpactStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list() {
    return this.prisma.impactStat.findMany({
      where: { isPublished: true },
      select: PUBLIC_SELECT,
      orderBy: { order: 'asc' },
    });
  }

  async listAdmin(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.impactStat.findMany({
        select: ADMIN_SELECT,
        orderBy: { order: 'asc' },
        skip,
        take,
      }),
      this.prisma.impactStat.count(),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const stat = await this.prisma.impactStat.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!stat) throw new NotFoundException('Impact stat not found');
    return stat;
  }

  async create(dto: CreateImpactStatDto, actorId: string, ipAddress?: string) {
    try {
      const stat = await this.prisma.impactStat.create({
        data: {
          label: dto.label,
          value: dto.value,
          order: dto.order ?? 0,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'ImpactStat',
        entityId: stat.id,
        actorId,
        after: { label: stat.label },
        ipAddress,
      });
      return stat;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateImpactStatDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    try {
      const stat = await this.prisma.impactStat.update({
        where: { id },
        data: dto,
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'ImpactStat',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(stat),
        ipAddress,
      });
      return stat;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.impactStat.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'ImpactStat',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private auditSnapshot(stat: { label: string }) {
    return {
      label: stat.label,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Impact stat not found');
      }
    }
    throw error;
  }
}
