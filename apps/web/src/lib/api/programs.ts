import { apiClient } from "../api-client";

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
}

export function listPrograms(take?: number): Promise<Program[]> {
  return apiClient.get<Program[]>(`/programs${take ? `?take=${take}` : ""}`);
}

export function getProgramBySlug(slug: string): Promise<Program> {
  return apiClient.get<Program>(`/programs/${slug}`);
}
