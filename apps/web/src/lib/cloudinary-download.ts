// Forces a real "download" for a Cloudinary-hosted file, instead of relying
// on the HTML `download` attribute — which browsers ignore for cross-origin
// links (res.cloudinary.com is cross-origin from this site), and instead of
// trusting Cloudinary's delivery Content-Type (raw/document uploads with no
// extension in their public ID are served with an undetermined
// Content-Type, so the browser renders the PDF bytes inline as text rather
// than downloading — see media.service.ts's upload-time fix for the other
// half of this).
//
// Cloudinary's `fl_attachment:<name>` delivery flag makes Cloudinary itself
// emit `Content-Disposition: attachment; filename="<name>.<ext>"` — a
// server-driven header that forces a save-as dialog regardless of origin or
// Content-Type, and regardless of whether the stored asset already has an
// extension (Cloudinary appends the asset's real stored format to the name
// automatically). That also means this fixes downloads for files that were
// uploaded before the upload-time fix existed, with no re-upload needed.

const CLOUDINARY_HOST_PREFIX = 'https://res.cloudinary.com/';
const UPLOAD_MARKER = '/upload/';

// Cloudinary rejects `.`, `/`, and a handful of other characters in an
// fl_attachment filename value. A strict allowlist is simpler and safer
// than trying to escape/encode around that reserved set.
const UNSAFE_CHARS = /[^a-zA-Z0-9 _-]/g;

export function sanitizeDownloadFilename(input: string, fallback = 'download'): string {
  const cleaned = input
    .replace(UNSAFE_CHARS, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 100);
  return cleaned || fallback;
}

/**
 * Rewrites a Cloudinary secure_url to force attachment delivery with a
 * human-readable filename. Falls back to the original URL unchanged for
 * anything that isn't a recognizable Cloudinary delivery URL — this never
 * proxies or fetches the URL itself, so an unexpected shape just means no
 * rewrite happens, not a broken or redirected request.
 */
export function buildCloudinaryAttachmentUrl(secureUrl: string, desiredName: string): string {
  if (!secureUrl.startsWith(CLOUDINARY_HOST_PREFIX)) return secureUrl;

  const markerIndex = secureUrl.indexOf(UPLOAD_MARKER);
  if (markerIndex === -1) return secureUrl;

  const insertAt = markerIndex + UPLOAD_MARKER.length;
  const safeName = encodeURIComponent(sanitizeDownloadFilename(desiredName));

  return `${secureUrl.slice(0, insertAt)}fl_attachment:${safeName}/${secureUrl.slice(insertAt)}`;
}
