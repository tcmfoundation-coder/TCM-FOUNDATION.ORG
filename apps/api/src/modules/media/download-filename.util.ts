// Builds the Content-Disposition header for the file-download endpoints
// (media.controller.ts, downloads.controller.ts) — the API sets this header
// itself now, rather than the earlier approach of asking Cloudinary's
// `fl_attachment` delivery flag to set it via a hand-built URL, which broke
// in production against `raw` resource-type delivery (see PR description).
//
// Deliberately NOT an ASCII-only allowlist: unlike embedding a name in a
// Cloudinary URL path segment, an HTTP header can carry non-ASCII filenames
// correctly via RFC 6266 + RFC 5987's `filename*=UTF-8''...` parameter, so
// this preserves them (e.g. Arabic titles) instead of stripping them.

// Turn path separators into hyphens rather than stripping them, so a title
// like "Q1/Q2 Report" reads as "Q1-Q2-Report" instead of silently losing
// everything before the slash (some Content-Disposition implementations
// treat a raw "/" as a path separator and keep only the last segment).
const PATH_SEPARATORS = /[/\\]+/g;

export function sanitizeDownloadFilename(
  input: string,
  fallback = 'download',
): string {
  const cleaned = input
    .replace(PATH_SEPARATORS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
  return cleaned || fallback;
}

export function buildDownloadFilename(
  desiredName: string,
  extension?: string,
): string {
  const base = sanitizeDownloadFilename(desiredName);
  return extension ? `${base}.${extension}` : base;
}

// RFC 5987's attr-char set excludes a handful of characters that
// encodeURIComponent leaves unescaped (* ' ( )). Percent-encoding a
// character that could legally appear literal is always safe — decoders
// resolve it back to the same character — so over-encoding these four is
// spec-compliant, just slightly more verbose than strictly necessary.
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /[*'()]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Builds a full Content-Disposition: attachment header value, RFC
 * 6266/5987-correct: a quoted ASCII-safe fallback for clients that don't
 * understand the extended syntax, plus filename*=UTF-8''<percent-encoded>
 * carrying the real name (including non-ASCII characters) for clients that
 * do. Both branches percent-/underscore-encode away CR, LF, and `"`, so
 * this is safe against header injection regardless of what sanitization
 * the caller already did upstream.
 */
export function buildContentDisposition(filename: string): string {
  const asciiFallback = filename
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/"/g, "'");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeRfc5987(filename)}`;
}
