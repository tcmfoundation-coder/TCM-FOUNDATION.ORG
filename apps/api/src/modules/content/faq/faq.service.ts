import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

const PUBLIC_SELECT = {
  id: true,
  question: true,
  answer: true,
  category: true,
} as const;

// The FAQ model has no `isPublished` field (schema.prisma) — unlike
// Program/TeamMember/etc., FAQ has no draft workflow, only ordering.
const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  order: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class FaqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(search?: string, category?: string) {
    const contains = search
      ? { contains: search, mode: 'insensitive' as const }
      : undefined;
    const where: Prisma.FAQWhereInput = {
      ...(category ? { category } : {}),
      ...(contains
        ? { OR: [{ question: contains }, { answer: contains }] }
        : {}),
    };
    return this.prisma.fAQ.findMany({
      where,
      select: PUBLIC_SELECT,
      orderBy: { order: 'asc' },
    });
  }

  async listAdmin(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.fAQ.findMany({
        select: ADMIN_SELECT,
        orderBy: { order: 'asc' },
        skip,
        take,
      }),
      this.prisma.fAQ.count(),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const faq = await this.prisma.fAQ.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!faq) throw new NotFoundException('FAQ not found');
    return faq;
  }

  async create(dto: CreateFaqDto, actorId: string, ipAddress?: string) {
    try {
      const faq = await this.prisma.fAQ.create({
        data: {
          question: dto.question,
          answer: dto.answer,
          category: dto.category,
          order: dto.order ?? 0,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'FAQ',
        entityId: faq.id,
        actorId,
        after: { question: faq.question },
        ipAddress,
      });
      return faq;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateFaqDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    try {
      const faq = await this.prisma.fAQ.update({
        where: { id },
        data: dto,
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'FAQ',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(faq),
        ipAddress,
      });
      return faq;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.fAQ.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'FAQ',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private auditSnapshot(faq: { question: string }) {
    return {
      question: faq.question,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('FAQ not found');
      }
    }
    throw error;
  }
}
