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

// Covers every allowed upload MIME type, not just documents — used by the
// download endpoint to pick a filename extension and Content-Type for
// pre-existing rows that predate the `mimeType` column (see media.service.ts
// streamById's fallback chain). Kept as the inverse of MIME_TO_MEDIA_TYPE's
// key set rather than merged into DOCUMENT_MIME_TO_EXTENSION, since that one
// has a narrower, load-bearing purpose (upload-time Cloudinary `format`).
export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  ...DOCUMENT_MIME_TO_EXTENSION,
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export const EXTENSION_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_TO_EXTENSION).map(([mime, ext]) => [ext, mime]),
);
