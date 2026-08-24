import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import {
  DOCUMENT_MIME_TO_EXTENSION,
  MIME_TO_MEDIA_TYPE,
} from './media.constants';

const PUBLIC_SELECT = {
  id: true,
  cloudinaryPublicId: true,
  secureUrl: true,
  type: true,
  altText: true,
  width: true,
  height: true,
} as const;

// The User model has no `displayName` field (schema.prisma) — only id/email.
const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  uploadedById: true,
  uploadedBy: {
    select: {
      id: true,
      email: true,
    },
  },
  createdAt: true,
} as const;

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(skip: number, take: number, type?: MediaType) {
    const where = type ? { type } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.media.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async upload(
    file: Express.Multer.File,
    altText: string,
    actorId: string,
    ipAddress?: string,
  ) {
    const mediaType = MIME_TO_MEDIA_TYPE[file.mimetype];
    if (!mediaType) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    let result: UploadApiResponse;
    try {
      result = await this.uploadBuffer(file.buffer, mediaType, file.mimetype);
    } catch {
      throw new BadRequestException('Failed to upload file to media storage');
    }

    const media = await this.prisma.media.create({
      data: {
        cloudinaryPublicId: result.public_id,
        secureUrl: result.secure_url,
        type: mediaType,
        altText,
        width: result.width,
        height: result.height,
        uploadedById: actorId,
      },
      select: ADMIN_SELECT,
    });

    await this.audit.record({
      action: 'MEDIA_UPLOADED',
      entityType: 'Media',
      entityId: media.id,
      actorId,
      after: { cloudinaryPublicId: media.cloudinaryPublicId, type: media.type },
      ipAddress,
    });

    return media;
  }

  private uploadBuffer(
    buffer: Buffer,
    mediaType: MediaType,
    mimetype: string,
  ): Promise<UploadApiResponse> {
    const resourceType =
      mediaType === MediaType.VIDEO
        ? 'video'
        : mediaType === MediaType.DOCUMENT
          ? 'raw'
          : 'image';

    // 'raw' is the one resource_type Cloudinary does not inspect to derive
    // a format — without this, the delivery URL comes back with no
    // extension and downloads get served with an undetermined Content-Type
    // instead of application/pdf (etc). image/video keep auto-detection.
    const format =
      resourceType === 'raw' ? DOCUMENT_MIME_TO_EXTENSION[mimetype] : undefined;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType, ...(format ? { format } : {}) },
        (error, result) => {
          if (error || !result) {
            reject(
              error
                ? new Error(error.message)
                : new Error('Cloudinary upload returned no result'),
            );
            return;
          }
          resolve(result);
        },
      );
      uploadStream.end(buffer);
    });
  }

  async update(
    id: string,
    dto: UpdateMediaDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    const media = await this.prisma.media.update({
      where: { id },
      data: dto,
      select: ADMIN_SELECT,
    });
    await this.audit.record({
      action: 'CONTENT_UPDATED',
      entityType: 'Media',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(media),
      ipAddress,
    });
    return media;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);

    await cloudinary.uploader.destroy(before.cloudinaryPublicId);

    await this.prisma.media.delete({ where: { id } });
    await this.audit.record({
      action: 'MEDIA_DELETED',
      entityType: 'Media',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private auditSnapshot(media: {
    cloudinaryPublicId: string;
    type: string;
    altText: string;
  }) {
    return {
      cloudinaryPublicId: media.cloudinaryPublicId,
      type: media.type,
      altText: media.altText,
    };
  }
}
