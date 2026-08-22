import { apiClient } from "../api-client";
import type { MediaRef } from "./media-ref";

// Shape returned by the public GET /downloads, /downloads/:slug endpoints.
export interface Download {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  file: MediaRef | null;
}

// Shape returned by GET /downloads/admin, /downloads/id/:id.
export interface DownloadAdmin extends Download {
  fileId: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DownloadAdminListResponse {
  items: DownloadAdmin[];
  total: number;
  skip: number;
  take: number;
}

export function listDownloads(): Promise<Download[]> {
  return apiClient.get<Download[]>("/downloads");
}

export function getDownloadBySlug(slug: string): Promise<Download> {
  return apiClient.get<Download>(`/downloads/${slug}`);
}

export function listDownloadsAdmin(params?: { skip?: number; take?: number }): Promise<DownloadAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  return apiClient.get<DownloadAdminListResponse>(`/downloads/admin${query ? `?${query}` : ""}`);
}

export function getDownloadById(id: string): Promise<DownloadAdmin> {
  return apiClient.get<DownloadAdmin>(`/downloads/id/${id}`);
}

export interface DownloadWriteInput {
  slug: string;
  title: string;
  description?: string;
  fileId: string;
}

// Endpoint: POST /downloads
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: DownloadAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 409 (duplicate slug)
export function createDownload(data: DownloadWriteInput): Promise<DownloadAdmin> {
  return apiClient.post<DownloadAdmin>("/downloads", data);
}

// Endpoint: PATCH /downloads/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: DownloadAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (duplicate slug)
export function updateDownload(id: string, data: Partial<DownloadWriteInput>): Promise<DownloadAdmin> {
  return apiClient.patch<DownloadAdmin>(`/downloads/${id}`, data);
}

// Endpoint: DELETE /downloads/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteDownload(id: string): Promise<void> {
  return apiClient.delete<void>(`/downloads/${id}`);
}

// Endpoint: PATCH /downloads/:id/publish
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: { isPublished: boolean }
// Response: DownloadAdmin
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function publishDownload(id: string, isPublished: boolean): Promise<DownloadAdmin> {
  return apiClient.patch<DownloadAdmin>(`/downloads/${id}/publish`, { isPublished });
}
