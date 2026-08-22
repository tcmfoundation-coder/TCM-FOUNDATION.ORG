import { apiClient } from "../api-client";

export interface SiteSettings {
  navigation: unknown;
  footer: unknown;
  newsletterConfig: unknown;
  tcmHubPopup: unknown;
  brandTokens: unknown;
  tcmTvUrl: string | null;
  learningHubUrl: string | null;
  donateUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  tagline: string | null;
}

export function getSiteSettings(): Promise<SiteSettings> {
  return apiClient.get<SiteSettings>("/site-settings");
}

// The five JSON fields (navigation/footer/newsletterConfig/tcmHubPopup/
// brandTokens) have no fixed shape of their own — nothing on the public
// site consumes them yet — so the admin editor treats each as an opaque
// object and lets the backend's @IsObject() validator be the only schema.
export interface UpdateSiteSettingsInput {
  tagline?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  tcmTvUrl?: string | null;
  learningHubUrl?: string | null;
  donateUrl?: string | null;
  navigation?: Record<string, unknown> | null;
  footer?: Record<string, unknown> | null;
  newsletterConfig?: Record<string, unknown> | null;
  tcmHubPopup?: Record<string, unknown> | null;
  brandTokens?: Record<string, unknown> | null;
}

// Endpoint: PATCH /site-settings
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: SiteSettings (the full updated singleton)
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden)
export function updateSiteSettings(data: UpdateSiteSettingsInput): Promise<SiteSettings> {
  return apiClient.patch<SiteSettings>("/site-settings", data);
}
