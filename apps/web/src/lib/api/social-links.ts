import { apiClient } from "../api-client";

export interface SocialLink {
  platform: string;
  url: string;
}

export function getSocialLinks(): Promise<SocialLink[]> {
  return apiClient.get<SocialLink[]>("/social-links");
}
