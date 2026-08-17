import { apiClient } from "../api-client";

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  publishedAt: string | null;
}

export function listArticles(take?: number): Promise<Article[]> {
  return apiClient.get<Article[]>(`/articles${take ? `?take=${take}` : ""}`);
}

export function getArticleBySlug(slug: string): Promise<Article> {
  return apiClient.get<Article>(`/articles/${slug}`);
}
