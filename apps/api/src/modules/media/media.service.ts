import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Readable } from 'stream';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import {
  DOCUMENT_MIME_TO_EXTENSION,
  EXTENSION_TO_MIME,
  MIME_TO_EXTENSION,
  MIME_TO_MEDIA_TYPE,
} from './media.constants';

// Every secure_url this app ever stores comes from a Cloudinary upload
// response (media.service.ts's own `upload()`), never from user input — but
// streamById() re-checks this before making a server-side request to it
// anyway, as defense in depth against the stored value ever being anything
// other than a Cloudinary delivery URL (a corrupted row, a future bug
// elsewhere). This is what keeps the download endpoint from becoming an
// open server-side-request proxy for arbitrary URLs.
const CLOUDINARY_DELIVERY_PREFIX = 'https://res.cloudinary.com/';

export interface MediaStream {
  stream: Readable;
  contentType: string;
  contentLength?: number;
  extension?: string;
}

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
        mimeType: file.mimetype,
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

  /**
   * Fetches a Media row's bytes from Cloudinary and hands back a Readable
   * plus the headers to serve it with — the API becomes the one thing the
   * browser ever talks to for a download, instead of the browser navigating
   * straight to a Cloudinary URL (see media.controller.ts / downloads
   * module for why: a hand-built Cloudinary URL flag broke in production,
   * and a cross-origin link can't reliably force a download at all).
   *
   * Genuinely streams: `fetch`'s response body is piped straight through
   * via Readable.fromWeb, never buffered into a Buffer/string first, so
   * serving a large PDF doesn't hold the whole file in Node's memory.
   */
  async streamById(id: string): Promise<MediaStream> {
    const media = await this.prisma.media.findUnique({
      where: { id },
      select: { secureUrl: true, cloudinaryPublicId: true, mimeType: true },
    });
    if (!media) throw new NotFoundException('Media not found');

    if (!media.secureUrl.startsWith(CLOUDINARY_DELIVERY_PREFIX)) {
      throw new BadGatewayException(
        'Stored file does not point to a recognized storage location',
      );
    }

    let upstream: Response;
    try {
      upstream = await fetch(media.secureUrl);
    } catch {
      throw new BadGatewayException('Failed to reach media storage');
    }
    if (!upstream.ok || !upstream.body) {
      throw new NotFoundException('File not found in storage');
    }

    const extension =
      extensionFromPublicId(media.cloudinaryPublicId) ??
      (media.mimeType ? MIME_TO_EXTENSION[media.mimeType] : undefined);
    const contentType =
      media.mimeType ??
      (extension ? EXTENSION_TO_MIME[extension] : undefined) ??
      'application/octet-stream';
    const contentLengthHeader = upstream.headers.get('content-length');

    return {
      stream: Readable.fromWeb(
        upstream.body as unknown as import('stream/web').ReadableStream,
      ),
      contentType,
      contentLength: contentLengthHeader
        ? Number(contentLengthHeader)
        : undefined,
      extension,
    };
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

// Cloudinary public IDs look like "folder/name.ext" for image/video (always
// auto-detected) and, for documents uploaded after the upload-time `format`
// fix, "folder/name.pdf" too. Older raw uploads predating that fix have no
// extension here at all, in which case this returns undefined and the
// caller falls back to the stored mimeType instead.
function extensionFromPublicId(publicId: string): string | undefined {
  const match = /\.([a-zA-Z0-9]{1,8})$/.exec(publicId);
  return match?.[1]?.toLowerCase();
}
