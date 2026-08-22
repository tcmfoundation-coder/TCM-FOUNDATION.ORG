import { apiClient } from "../api-client";

export type CategoryAppliesTo = "BLOG" | "ARTICLE" | "SPOTLIGHT" | "OPPORTUNITY";

export interface Category {
  id: string;
  name: string;
  slug: string;
  appliesTo: CategoryAppliesTo;
}

// Endpoint: GET /categories
// Authentication: None (public)
// Response: Category[]
export function listCategories(appliesTo: CategoryAppliesTo): Promise<Category[]> {
  return apiClient.get<Category[]>(`/categories?appliesTo=${appliesTo}`);
}
