import { apiClient } from "../api-client";
import type { MediaRef } from "./media-ref";
import type { CategoryRef, TagRef } from "./taxonomy-ref";

// Shape returned by the public GET /articles, /articles/:slug endpoints.
export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  publishedAt: string | null;
  coverImage: MediaRef | null;
  categories: (CategoryRef & { slug: string })[];
}

// Shape returned by GET /articles/admin, /articles/id/:id. Note
// tags come back as full {id,name} objects here, not id arrays — those
// only apply to write payloads (see ArticleWriteInput).
export interface ArticleAdmin extends Article {
  coverImageId: string | null;
  tags: TagRef[];
  authorId: string | null;
  author: { id: string; email: string } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleListResponse {
  items: Article[];
  total: number;
  skip: number;
  take: number;
}

export interface ArticleAdminListResponse {
  items: ArticleAdmin[];
  total: number;
  skip: number;
  take: number;
}

export function listArticles(params?: { skip?: number; take?: number; category?: string }): Promise<ArticleListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  if (params?.category) searchParams.append("category", params.category);
  const query = searchParams.toString();
  return apiClient.get<ArticleListResponse>(`/articles${query ? `?${query}` : ""}`);
}

export function listArticlesAdmin(params?: { skip?: number; take?: number }): Promise<ArticleAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  return apiClient.get<ArticleAdminListResponse>(`/articles/admin${query ? `?${query}` : ""}`);
}

export function getArticleBySlug(slug: string): Promise<Article> {
  return apiClient.get<Article>(`/articles/${slug}`);
}

export function getArticleById(id: string): Promise<ArticleAdmin> {
  return apiClient.get<ArticleAdmin>(`/articles/id/${id}`);
}

export interface ArticleWriteInput {
  slug: string;
  title: string;
  body: string;
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
  coverImageId?: string | null;
  categoryIds?: string[];
  tagIds?: string[];
  authorId?: string;
}

// Endpoint: POST /articles
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: ArticleAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 409 (duplicate slug)
export function createArticle(data: ArticleWriteInput): Promise<ArticleAdmin> {
  return apiClient.post<ArticleAdmin>("/articles", data);
}

// Endpoint: PATCH /articles/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: ArticleAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (duplicate slug)
export function updateArticle(id: string, data: Partial<ArticleWriteInput>): Promise<ArticleAdmin> {
  return apiClient.patch<ArticleAdmin>(`/articles/${id}`, data);
}

// Endpoint: DELETE /articles/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteArticle(id: string): Promise<void> {
  return apiClient.delete<void>(`/articles/${id}`);
}

// Endpoint: PATCH /articles/:id/publish
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: { isPublished: boolean }
// Response: ArticleAdmin
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function publishArticle(id: string, isPublished: boolean): Promise<ArticleAdmin> {
  return apiClient.patch<ArticleAdmin>(`/articles/${id}/publish`, { isPublished });
}
