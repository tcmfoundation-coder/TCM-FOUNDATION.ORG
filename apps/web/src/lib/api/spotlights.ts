import { apiClient } from "../api-client";

export interface Spotlight {
  id: string;
  slug: string;
  subjectName: string;
  title: string;
  body: string;
  publishedAt: string | null;
}

export function listSpotlights(take?: number): Promise<Spotlight[]> {
  return apiClient.get<Spotlight[]>(`/spotlights${take ? `?take=${take}` : ""}`);
}

export function getSpotlightBySlug(slug: string): Promise<Spotlight> {
  return apiClient.get<Spotlight>(`/spotlights/${slug}`);
}
