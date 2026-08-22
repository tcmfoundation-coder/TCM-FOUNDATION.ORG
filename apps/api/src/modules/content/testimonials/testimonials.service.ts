import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

const PUBLIC_SELECT = {
  id: true,
  authorName: true,
  authorRole: true,
  quote: true,
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  order: true,
  isApproved: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class TestimonialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(take?: number) {
    return this.prisma.testimonial.findMany({
      where: { isApproved: true },
      select: PUBLIC_SELECT,
      orderBy: { order: 'asc' },
      take,
    });
  }

  async listAdmin(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.testimonial.findMany({
        select: ADMIN_SELECT,
        orderBy: { order: 'asc' },
        skip,
        take,
      }),
      this.prisma.testimonial.count(),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!testimonial) throw new NotFoundException('Testimonial not found');
    return testimonial;
  }

  async create(dto: CreateTestimonialDto, actorId: string, ipAddress?: string) {
    try {
      const testimonial = await this.prisma.testimonial.create({
        data: {
          authorName: dto.authorName,
          authorRole: dto.authorRole,
          quote: dto.quote,
          order: dto.order ?? 0,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'Testimonial',
        entityId: testimonial.id,
        actorId,
        after: { authorName: testimonial.authorName },
        ipAddress,
      });
      return testimonial;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateTestimonialDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    try {
      const testimonial = await this.prisma.testimonial.update({
        where: { id },
        data: dto,
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'Testimonial',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(testimonial),
        ipAddress,
      });
      return testimonial;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.testimonial.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'Testimonial',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private auditSnapshot(testimonial: { authorName: string }) {
    return {
      authorName: testimonial.authorName,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Testimonial not found');
      }
    }
    throw error;
  }
}
