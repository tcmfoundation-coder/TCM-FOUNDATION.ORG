import { apiClient } from "../api-client";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  publishedAt: string | null;
}

export function listBlogPosts(take?: number): Promise<BlogPost[]> {
  return apiClient.get<BlogPost[]>(`/blog${take ? `?take=${take}` : ""}`);
}

export function getBlogPostBySlug(slug: string): Promise<BlogPost> {
  return apiClient.get<BlogPost>(`/blog/${slug}`);
}
