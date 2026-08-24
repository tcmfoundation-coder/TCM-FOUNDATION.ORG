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

// Only consulted for MediaType.DOCUMENT (Cloudinary resource_type: 'raw').
// image/video resource types have Cloudinary inspect the bytes and append
// the real extension to the delivery URL automatically; 'raw' assets are
// opaque blobs with no such detection, so without an explicit format at
// upload time the delivery URL ends up extension-less and Cloudinary has
// no reliable extension to derive Content-Type from — see media.service.ts.
export const DOCUMENT_MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
};
