import { MediaType } from '@prisma/client';

export const MAX_MEDIA_UPLOAD_BYTES = 15 * 1024 * 1024;

export const MIME_TO_MEDIA_TYPE: Record<string, MediaType> = {
  'image/jpeg': MediaType.IMAGE,
  'image/png': MediaType.IMAGE,
  'image/webp': MediaType.IMAGE,
  'image/gif': MediaType.IMAGE,
  'image/svg+xml': MediaType.IMAGE,
  'application/pdf': MediaType.DOCUMENT,
  'application/msword': MediaType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    MediaType.DOCUMENT,
  'video/mp4': MediaType.VIDEO,
  'video/webm': MediaType.VIDEO,
  'video/quicktime': MediaType.VIDEO,
};

export const ALLOWED_MEDIA_MIME_TYPES = new Set(
  Object.keys(MIME_TO_MEDIA_TYPE),
);
