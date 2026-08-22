import { apiClient } from "../api-client";

export interface SocialLink {
  platform: string;
  url: string;
}

export function getSocialLinks(): Promise<SocialLink[]> {
  return apiClient.get<SocialLink[]>("/social-links");
}

// Mirrors apps/web/src/components/ui/social-icon.tsx's PLATFORM_ICONS keys —
// the only platforms the site can actually render an icon for.
export const SOCIAL_LINK_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
  "x",
  "twitter",
  "tiktok",
] as const;

export type SocialLinkPlatform = (typeof SOCIAL_LINK_PLATFORMS)[number];

// Shape returned by GET /social-links/admin, /social-links/id/:id.
export interface SocialLinkAdmin {
  id: string;
  platform: string;
  url: string;
  order: number;
  isActive: boolean;
}

// Endpoint: GET /social-links/admin
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: SocialLinkAdmin[]
// Errors: 401 (unauthenticated), 403 (forbidden)
export function listSocialLinksAdmin(): Promise<SocialLinkAdmin[]> {
  return apiClient.get<SocialLinkAdmin[]>("/social-links/admin");
}

export function getSocialLinkById(id: string): Promise<SocialLinkAdmin> {
  return apiClient.get<SocialLinkAdmin>(`/social-links/id/${id}`);
}

export interface SocialLinkWriteInput {
  platform: string;
  url: string;
  order?: number;
  isActive?: boolean;
}

// Endpoint: POST /social-links
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: SocialLinkAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden)
export function createSocialLink(data: SocialLinkWriteInput): Promise<SocialLinkAdmin> {
  return apiClient.post<SocialLinkAdmin>("/social-links", data);
}

// Endpoint: PATCH /social-links/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: SocialLinkAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function updateSocialLink(id: string, data: Partial<SocialLinkWriteInput>): Promise<SocialLinkAdmin> {
  return apiClient.patch<SocialLinkAdmin>(`/social-links/${id}`, data);
}

// Endpoint: DELETE /social-links/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteSocialLink(id: string): Promise<void> {
  return apiClient.delete<void>(`/social-links/${id}`);
}
