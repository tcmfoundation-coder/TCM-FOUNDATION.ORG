import { apiClient } from "../api-client";
import type { MediaRef } from "./media-ref";
import type { CategoryRef, TagRef } from "./taxonomy-ref";

// Shape returned by the public GET /spotlights, /spotlights/:slug endpoints.
export interface Spotlight {
  id: string;
  slug: string;
  subjectName: string;
  title: string;
  body: string;
  publishedAt: string | null;
  coverImage: MediaRef | null;
}

// Shape returned by GET /spotlights/admin, /spotlights/id/:id. Spotlights
// have no author relation (unlike Blog/Articles) — subjectName covers that
// role instead. categories/tags come back as full {id,name} objects here,
// not id arrays — those only apply to write payloads.
export interface SpotlightAdmin extends Spotlight {
  coverImageId: string | null;
  categories: CategoryRef[];
  tags: TagRef[];
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SpotlightListResponse {
  items: Spotlight[];
  total: number;
  skip: number;
  take: number;
}

export interface SpotlightAdminListResponse {
  items: SpotlightAdmin[];
  total: number;
  skip: number;
  take: number;
}

export function listSpotlights(params?: { skip?: number; take?: number }): Promise<SpotlightListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  return apiClient.get<SpotlightListResponse>(`/spotlights${query ? `?${query}` : ""}`);
}

export function listSpotlightsAdmin(params?: { skip?: number; take?: number }): Promise<SpotlightAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  return apiClient.get<SpotlightAdminListResponse>(`/spotlights/admin${query ? `?${query}` : ""}`);
}

export function getSpotlightBySlug(slug: string): Promise<Spotlight> {
  return apiClient.get<Spotlight>(`/spotlights/${slug}`);
}

export function getSpotlightById(id: string): Promise<SpotlightAdmin> {
  return apiClient.get<SpotlightAdmin>(`/spotlights/id/${id}`);
}

export interface SpotlightWriteInput {
  slug: string;
  subjectName: string;
  title: string;
  body: string;
  seoTitle?: string;
  seoDescription?: string;
  coverImageId?: string | null;
  categoryIds?: string[];
  tagIds?: string[];
}

// Endpoint: POST /spotlights
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: SpotlightAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 409 (duplicate slug)
export function createSpotlight(data: SpotlightWriteInput): Promise<SpotlightAdmin> {
  return apiClient.post<SpotlightAdmin>("/spotlights", data);
}

// Endpoint: PATCH /spotlights/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: SpotlightAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (duplicate slug)
export function updateSpotlight(id: string, data: Partial<SpotlightWriteInput>): Promise<SpotlightAdmin> {
  return apiClient.patch<SpotlightAdmin>(`/spotlights/${id}`, data);
}

// Endpoint: DELETE /spotlights/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteSpotlight(id: string): Promise<void> {
  return apiClient.delete<void>(`/spotlights/${id}`);
}

// Endpoint: PATCH /spotlights/:id/publish
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: { isPublished: boolean }
// Response: SpotlightAdmin
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function publishSpotlight(id: string, isPublished: boolean): Promise<SpotlightAdmin> {
  return apiClient.patch<SpotlightAdmin>(`/spotlights/${id}/publish`, { isPublished });
}
