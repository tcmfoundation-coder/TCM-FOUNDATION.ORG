import { apiClient } from "../api-client";

export interface SiteSettings {
  navigation: unknown;
  footer: unknown;
  newsletterConfig: unknown;
  tcmHubPopup: unknown;
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
