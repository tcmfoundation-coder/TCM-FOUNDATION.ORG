import { apiClient } from "../api-client";

// Mirrors the closed `MediaType` enum in schema.prisma — Cloudinary's own
// resource_type/format/bytes are not persisted (see media.service.ts), so
// this is the full set of fields the backend actually returns.
export type MediaType = "IMAGE" | "DOCUMENT" | "VIDEO";

export interface Media {
  id: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  type: MediaType;
  altText: string;
  width: number | null;
  height: number | null;
  uploadedById: string | null;
  uploadedBy: { id: string; email: string } | null;
  createdAt: string;
}

export interface MediaListResponse {
  items: Media[];
  total: number;
  skip: number;
  take: number;
}

export function listMedia(params?: { skip?: number; take?: number; type?: MediaType }): Promise<MediaListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  if (params?.type) searchParams.append("type", params.type);
  const query = searchParams.toString();
  const url = query ? "/media?" + query : "/media";
  return apiClient.get<MediaListResponse>(url);
}

export function getMediaById(id: string): Promise<Media> {
  return apiClient.get<Media>("/media/" + id);
}

// BACKEND API REQUIRED - Upload Media
// Endpoint: POST /media/upload
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: multipart/form-data with file and altText
// Response: Media
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden)
export function uploadMedia(file: File, altText: string): Promise<Media> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("altText", altText);
  return apiClient.post<Media>("/media/upload", formData);
}

// BACKEND API REQUIRED - Update Media
// Endpoint: PATCH /media/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: { altText } — the Media model has no `tags` field to persist
// Response: Media
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function updateMedia(id: string, data: { altText: string }): Promise<Media> {
  return apiClient.patch<Media>("/media/" + id, data);
}

// BACKEND API REQUIRED - Delete Media
// Endpoint: DELETE /media/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteMedia(id: string): Promise<void> {
  return apiClient.delete<void>("/media/" + id);
}
