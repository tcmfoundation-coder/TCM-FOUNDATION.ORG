import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type OpportunityType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  type: true,
  deadline: true,
  externalApplyUrl: true,
} as const;

// The admin list has to show drafts alongside live entries and render the
// publish toggle, neither of which the public shape carries.
const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(type?: OpportunityType, skip?: number, take?: number) {
    const where = { isPublished: true, ...(type ? { type } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where,
        select: PUBLIC_SELECT,
        orderBy: { deadline: 'asc' },
        skip: skip ?? 0,
        take: take ?? 100,
      }),
      this.prisma.opportunity.count({ where }),
    ]);
    return { items, total, skip: skip ?? 0, take: take ?? 100 };
  }

  async getBySlug(slug: string) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    return opportunity;
  }

  async listAdmin(skip: number, take: number, type?: OpportunityType) {
    const where = type ? { type } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.opportunity.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    return opportunity;
  }

  async create(dto: CreateOpportunityDto, actorId: string, ipAddress?: string) {
    try {
      const opportunity = await this.prisma.opportunity.create({
        data: {
          slug: dto.slug,
          title: dto.title,
          description: dto.description,
          type: dto.type,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          externalApplyUrl: dto.externalApplyUrl,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'Opportunity',
        entityId: opportunity.id,
        actorId,
        after: this.auditSnapshot(opportunity),
        ipAddress,
      });
      return opportunity;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateOpportunityDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    try {
      const opportunity = await this.prisma.opportunity.update({
        where: { id },
        data: {
          ...dto,
          // `deadline` is independently clearable: an explicit null removes
          // the date, while omitting the key leaves it untouched.
          ...(dto.deadline === undefined
            ? {}
            : { deadline: dto.deadline ? new Date(dto.deadline) : null }),
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'Opportunity',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(opportunity),
        ipAddress,
      });
      return opportunity;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async setPublished(
    id: string,
    isPublished: boolean,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    const opportunity = await this.prisma.opportunity.update({
      where: { id },
      data: { isPublished },
      select: ADMIN_SELECT,
    });
    await this.audit.record({
      action: 'CONTENT_UPDATED',
      entityType: 'Opportunity',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(opportunity),
      ipAddress,
    });
    return opportunity;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.opportunity.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'Opportunity',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private auditSnapshot(opportunity: {
    slug: string;
    title: string;
    type: OpportunityType;
    isPublished: boolean;
  }) {
    return {
      slug: opportunity.slug,
      title: opportunity.title,
      type: opportunity.type,
      isPublished: opportunity.isPublished,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Opportunity slug already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Opportunity not found');
      }
    }
    throw error;
  }
}
