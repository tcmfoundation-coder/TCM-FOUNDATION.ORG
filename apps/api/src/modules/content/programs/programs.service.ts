import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  objectives: true,
  audience: true,
  impact: true,
  ctaLabel: true,
  ctaUrl: true,
  createdAt: true,
  heroImage: {
    select: {
      id: true,
      cloudinaryPublicId: true,
      secureUrl: true,
      altText: true,
    },
  },
  // Public: the About page's programme gallery reads these. They are already
  // admin-curated media rows, and nothing about them is privileged — the
  // same images are served straight from Cloudinary once referenced.
  galleryMedia: {
    select: {
      id: true,
      cloudinaryPublicId: true,
      secureUrl: true,
      altText: true,
    },
  },
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  heroImageId: true,
  isPublished: true,
  updatedAt: true,
} as const;

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(skip?: number, take?: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.program.findMany({
        where: { isPublished: true },
        select: PUBLIC_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: skip ?? 0,
        take: take ?? 100,
      }),
      this.prisma.program.count({ where: { isPublished: true } }),
    ]);
    return { items, total, skip: skip ?? 0, take: take ?? 100 };
  }

  async getBySlug(slug: string) {
    const program = await this.prisma.program.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  async listAdmin(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.program.findMany({
        select: ADMIN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.program.count(),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  async create(dto: CreateProgramDto, actorId: string, ipAddress?: string) {
    await this.assertMediaReferences(dto.heroImageId, dto.galleryMediaIds);
    try {
      const program = await this.prisma.program.create({
        data: {
          slug: dto.slug,
          title: dto.title,
          description: dto.description,
          objectives: dto.objectives,
          audience: dto.audience,
          impact: dto.impact,
          ctaLabel: dto.ctaLabel,
          ctaUrl: dto.ctaUrl,
          heroImageId: dto.heroImageId,
          galleryMedia: dto.galleryMediaIds
            ? { connect: dto.galleryMediaIds.map((id) => ({ id })) }
            : undefined,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'Program',
        entityId: program.id,
        actorId,
        after: { slug: program.slug, isPublished: program.isPublished },
        ipAddress,
      });
      return program;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateProgramDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    await this.assertMediaReferences(dto.heroImageId, dto.galleryMediaIds);
    try {
      const program = await this.prisma.program.update({
        where: { id },
        data: {
          ...this.programScalarData(dto),
          ...(dto.galleryMediaIds === undefined
            ? {}
            : {
                galleryMedia: {
                  set: dto.galleryMediaIds.map((mediaId) => ({ id: mediaId })),
                },
              }),
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'Program',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(program),
        ipAddress,
      });
      return program;
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
    const program = await this.prisma.program.update({
      where: { id },
      data: { isPublished },
      select: ADMIN_SELECT,
    });
    await this.audit.record({
      action: 'CONTENT_UPDATED',
      entityType: 'Program',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(program),
      ipAddress,
    });
    return program;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.program.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'Program',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private programScalarData(dto: UpdateProgramDto) {
    const data = { ...dto };
    Reflect.deleteProperty(data, 'galleryMediaIds');
    return data;
  }

  private async assertMediaReferences(
    heroImageId?: string,
    galleryMediaIds?: string[],
  ) {
    const ids = [heroImageId, ...(galleryMediaIds ?? [])].filter(
      (id): id is string => Boolean(id),
    );
    if (ids.length === 0) return;
    const media = await this.prisma.media.findMany({
      where: { id: { in: ids }, type: 'IMAGE' },
      select: { id: true },
    });
    if (media.length !== new Set(ids).size) {
      throw new BadRequestException(
        'Each media reference must be an existing image',
      );
    }
  }

  private auditSnapshot(program: {
    slug: string;
    title: string;
    isPublished: boolean;
    heroImageId: string | null;
  }) {
    return {
      slug: program.slug,
      title: program.title,
      isPublished: program.isPublished,
      heroImageId: program.heroImageId,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Program slug already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Program not found');
      }
    }
    throw error;
  }
}
