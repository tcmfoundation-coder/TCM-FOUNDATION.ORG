import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateDownloadDto } from './dto/create-download.dto';
import { UpdateDownloadDto } from './dto/update-download.dto';

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  file: {
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
  fileId: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class DownloadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  list(take?: number) {
    return this.prisma.download.findMany({
      where: { isPublished: true },
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getBySlug(slug: string) {
    const download = await this.prisma.download.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!download) throw new NotFoundException('Download not found');
    return download;
  }

  async listAdmin(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.download.findMany({
        select: ADMIN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.download.count(),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const download = await this.prisma.download.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!download) throw new NotFoundException('Download not found');
    return download;
  }

  async create(dto: CreateDownloadDto, actorId: string, ipAddress?: string) {
    await this.assertMediaReference(dto.fileId);
    try {
      const download = await this.prisma.download.create({
        data: {
          slug: dto.slug,
          title: dto.title,
          description: dto.description,
          fileId: dto.fileId,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'Download',
        entityId: download.id,
        actorId,
        after: this.auditSnapshot(download),
        ipAddress,
      });
      return download;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateDownloadDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    if (dto.fileId) await this.assertMediaReference(dto.fileId);
    try {
      const download = await this.prisma.download.update({
        where: { id },
        data: dto,
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'Download',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(download),
        ipAddress,
      });
      return download;
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
    try {
      const download = await this.prisma.download.update({
        where: { id },
        data: { isPublished },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'Download',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(download),
        ipAddress,
      });
      return download;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.download.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'Download',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private async assertMediaReference(fileId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: fileId },
      select: { id: true },
    });
    if (!media) {
      throw new BadRequestException(
        'File must reference an existing uploaded media item',
      );
    }
  }

  private auditSnapshot(download: {
    slug: string;
    title: string;
    fileId: string;
    isPublished: boolean;
  }) {
    return {
      slug: download.slug,
      title: download.title,
      fileId: download.fileId,
      isPublished: download.isPublished,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Download slug already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Download not found');
      }
    }
    throw error;
  }
}
