import { apiClient } from "../api-client";
import type { MediaRef } from "./media-ref";

// Shape returned by the public GET /programs, /programs/:slug endpoints.
export interface Program {
  id: string;
  slug: string;
  title: string;
  description: string;
  objectives: string | null;
  audience: string | null;
  impact: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  createdAt: string;
  heroImage: MediaRef | null;
  // Curated programme photography, surfaced by the About page gallery.
  galleryMedia: MediaRef[];
}

// Shape returned by GET /programs/admin, /programs/id/:id.
export interface ProgramAdmin extends Program {
  heroImageId: string | null;
  isPublished: boolean;
  updatedAt: string;
}

export interface ProgramListResponse {
  items: Program[];
  total: number;
  skip: number;
  take: number;
}

export interface ProgramAdminListResponse {
  items: ProgramAdmin[];
  total: number;
  skip: number;
  take: number;
}

export function listPrograms(params?: { skip?: number; take?: number }): Promise<ProgramListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  return apiClient.get<ProgramListResponse>(`/programs${query ? `?${query}` : ""}`);
}

export function listProgramsAdmin(params?: { skip?: number; take?: number }): Promise<ProgramAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  return apiClient.get<ProgramAdminListResponse>(`/programs/admin${query ? `?${query}` : ""}`);
}

export function getProgramBySlug(slug: string): Promise<Program> {
  return apiClient.get<Program>(`/programs/${slug}`);
}

export function getProgramById(id: string): Promise<ProgramAdmin> {
  return apiClient.get<ProgramAdmin>(`/programs/id/${id}`);
}

export interface ProgramWriteInput {
  slug: string;
  title: string;
  description: string;
  objectives?: string;
  audience?: string;
  impact?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  heroImageId?: string | null;
  galleryMediaIds?: string[];
}

// Endpoint: POST /programs
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: ProgramAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 409 (duplicate slug)
export function createProgram(data: ProgramWriteInput): Promise<ProgramAdmin> {
  return apiClient.post<ProgramAdmin>("/programs", data);
}

// Endpoint: PATCH /programs/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: ProgramAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (duplicate slug)
export function updateProgram(id: string, data: Partial<ProgramWriteInput>): Promise<ProgramAdmin> {
  return apiClient.patch<ProgramAdmin>(`/programs/${id}`, data);
}

// BACKEND API REQUIRED - Delete Program
// Endpoint: DELETE /programs/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteProgram(id: string): Promise<void> {
  return apiClient.delete<void>(`/programs/${id}`);
}

// BACKEND API REQUIRED - Publish/Unpublish Program
// Endpoint: PATCH /programs/:id/publish
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: { isPublished: boolean }
// Response: Program
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function publishProgram(id: string, isPublished: boolean): Promise<ProgramAdmin> {
  return apiClient.patch<ProgramAdmin>(`/programs/${id}/publish`, { isPublished });
}
