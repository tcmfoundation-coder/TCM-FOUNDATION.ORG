import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateSpotlightDto } from './dto/create-spotlight.dto';
import { UpdateSpotlightDto } from './dto/update-spotlight.dto';

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  subjectName: true,
  title: true,
  body: true,
  publishedAt: true,
  coverImage: {
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
  coverImageId: true,
  categories: {
    select: {
      id: true,
      name: true,
    },
  },
  tags: {
    select: {
      id: true,
      name: true,
    },
  },
  seoTitle: true,
  seoDescription: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class SpotlightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(skip?: number, take?: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.spotlight.findMany({
        where: { isPublished: true },
        select: PUBLIC_SELECT,
        orderBy: { publishedAt: 'desc' },
        skip: skip ?? 0,
        take: take ?? 100,
      }),
      this.prisma.spotlight.count({ where: { isPublished: true } }),
    ]);
    return { items, total, skip: skip ?? 0, take: take ?? 100 };
  }

  async getBySlug(slug: string) {
    const spotlight = await this.prisma.spotlight.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!spotlight) throw new NotFoundException('Spotlight not found');
    return spotlight;
  }

  async listAdmin(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.spotlight.findMany({
        select: ADMIN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.spotlight.count(),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const spotlight = await this.prisma.spotlight.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!spotlight) throw new NotFoundException('Spotlight not found');
    return spotlight;
  }

  async create(dto: CreateSpotlightDto, actorId: string, ipAddress?: string) {
    await this.assertMediaReferences(dto.coverImageId);
    try {
      const spotlight = await this.prisma.spotlight.create({
        data: {
          slug: dto.slug,
          subjectName: dto.subjectName,
          title: dto.title,
          body: dto.body,
          seoTitle: dto.seoTitle,
          seoDescription: dto.seoDescription,
          coverImageId: dto.coverImageId,
          categories: dto.categoryIds
            ? { connect: dto.categoryIds.map((id) => ({ id })) }
            : undefined,
          tags: dto.tagIds
            ? { connect: dto.tagIds.map((id) => ({ id })) }
            : undefined,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'Spotlight',
        entityId: spotlight.id,
        actorId,
        after: { slug: spotlight.slug, isPublished: spotlight.isPublished },
        ipAddress,
      });
      return spotlight;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateSpotlightDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    await this.assertMediaReferences(dto.coverImageId);
    try {
      const spotlight = await this.prisma.spotlight.update({
        where: { id },
        data: {
          ...this.spotlightScalarData(dto),
          ...(dto.categoryIds === undefined
            ? {}
            : {
                categories: {
                  set: dto.categoryIds.map((id) => ({ id })),
                },
              }),
          ...(dto.tagIds === undefined
            ? {}
            : {
                tags: {
                  set: dto.tagIds.map((id) => ({ id })),
                },
              }),
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'Spotlight',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(spotlight),
        ipAddress,
      });
      return spotlight;
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
    const spotlight = await this.prisma.spotlight.update({
      where: { id },
      data: { isPublished, publishedAt: isPublished ? new Date() : null },
      select: ADMIN_SELECT,
    });
    await this.audit.record({
      action: 'CONTENT_UPDATED',
      entityType: 'Spotlight',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(spotlight),
      ipAddress,
    });
    return spotlight;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.spotlight.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'Spotlight',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private spotlightScalarData(dto: UpdateSpotlightDto) {
    const data = { ...dto };
    Reflect.deleteProperty(data, 'categoryIds');
    Reflect.deleteProperty(data, 'tagIds');
    return data;
  }

  private async assertMediaReferences(coverImageId?: string) {
    if (!coverImageId) return;
    const media = await this.prisma.media.findUnique({
      where: { id: coverImageId },
      select: { id: true, type: true },
    });
    if (!media || media.type !== 'IMAGE') {
      throw new BadRequestException('Cover image must be an existing image');
    }
  }

  private auditSnapshot(spotlight: {
    slug: string;
    title: string;
    isPublished: boolean;
    coverImageId: string | null;
  }) {
    return {
      slug: spotlight.slug,
      title: spotlight.title,
      isPublished: spotlight.isPublished,
      coverImageId: spotlight.coverImageId,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Spotlight slug already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Spotlight not found');
      }
    }
    throw error;
  }
}
