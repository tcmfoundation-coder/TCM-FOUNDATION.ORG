import { apiClient } from "../api-client";

export interface Download {
  id: string;
  slug: string;
  title: string;
  description: string | null;
}

export function listDownloads(): Promise<Download[]> {
  return apiClient.get<Download[]>("/downloads");
}

export function getDownloadBySlug(slug: string): Promise<Download> {
  return apiClient.get<Download>(`/downloads/${slug}`);
}
