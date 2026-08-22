import { apiClient } from "../api-client";
import type { MediaRef } from "./media-ref";
import type { CategoryRef, TagRef } from "./taxonomy-ref";

export type { CategoryRef, TagRef } from "./taxonomy-ref";

// Shape returned by the public GET /blog, /blog/:slug endpoints.
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  publishedAt: string | null;
  coverImage: MediaRef | null;
}

// Shape returned by GET /blog/admin, /blog/id/:id. Note categories/tags come
// back as full {id,name} objects here, not id arrays — those only apply to
// write payloads (see BlogPostWriteInput).
export interface BlogPostAdmin extends BlogPost {
  coverImageId: string | null;
  categories: CategoryRef[];
  tags: TagRef[];
  authorId: string | null;
  author: { id: string; email: string } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostListResponse {
  items: BlogPost[];
  total: number;
  skip: number;
  take: number;
}

export interface BlogPostAdminListResponse {
  items: BlogPostAdmin[];
  total: number;
  skip: number;
  take: number;
}

export function listBlogPosts(params?: { skip?: number; take?: number }): Promise<BlogPostListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  return apiClient.get<BlogPostListResponse>(`/blog${query ? `?${query}` : ""}`);
}

export function listBlogPostsAdmin(params?: { skip?: number; take?: number }): Promise<BlogPostAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  return apiClient.get<BlogPostAdminListResponse>(`/blog/admin${query ? `?${query}` : ""}`);
}

export function getBlogPostBySlug(slug: string): Promise<BlogPost> {
  return apiClient.get<BlogPost>(`/blog/${slug}`);
}

export function getBlogPostById(id: string): Promise<BlogPostAdmin> {
  return apiClient.get<BlogPostAdmin>(`/blog/id/${id}`);
}

export interface BlogPostWriteInput {
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

// Endpoint: POST /blog
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: BlogPostAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 409 (duplicate slug)
export function createBlogPost(data: BlogPostWriteInput): Promise<BlogPostAdmin> {
  return apiClient.post<BlogPostAdmin>("/blog", data);
}

// Endpoint: PATCH /blog/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: BlogPostAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (duplicate slug)
export function updateBlogPost(id: string, data: Partial<BlogPostWriteInput>): Promise<BlogPostAdmin> {
  return apiClient.patch<BlogPostAdmin>(`/blog/${id}`, data);
}

// BACKEND API REQUIRED - Delete Blog Post
// Endpoint: DELETE /blog/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteBlogPost(id: string): Promise<void> {
  return apiClient.delete<void>(`/blog/${id}`);
}

// BACKEND API REQUIRED - Publish/Unpublish Blog Post
// Endpoint: PATCH /blog/:id/publish
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: { isPublished: boolean }
// Response: BlogPost
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function publishBlogPost(id: string, isPublished: boolean): Promise<BlogPostAdmin> {
  return apiClient.patch<BlogPostAdmin>(`/blog/${id}/publish`, { isPublished });
}
