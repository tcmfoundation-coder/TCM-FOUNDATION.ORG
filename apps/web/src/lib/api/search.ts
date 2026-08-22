import { apiClient } from "../api-client";

export type SearchResultType =
  | "program"
  | "blog"
  | "article"
  | "spotlight"
  | "opportunity"
  | "call-for-application";

export interface SearchResult {
  type: SearchResultType;
  slug: string;
  title: string;
  excerpt: string | null;
}

export function search(query: string): Promise<SearchResult[]> {
  return apiClient.get<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`, { revalidateSeconds: 0 });
}
