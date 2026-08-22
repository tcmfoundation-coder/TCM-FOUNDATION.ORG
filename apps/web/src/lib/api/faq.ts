import { apiClient } from "../api-client";

// Shape returned by the public GET /faq endpoint.
export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

// Shape returned by GET /faq/admin — the FAQ model has no `isPublished`
// field (schema.prisma), only ordering.
export interface FaqEntryAdmin extends FaqEntry {
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface FaqListResponse {
  items: FaqEntry[];
  total: number;
  skip: number;
  take: number;
}

export interface FaqAdminListResponse {
  items: FaqEntryAdmin[];
  total: number;
  skip: number;
  take: number;
}

// GET /faq returns a plain array, not a {items,...} envelope — the backend
// route takes no pagination params.
export function listFaq(params?: { search?: string; category?: string }): Promise<FaqEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append("search", params.search);
  if (params?.category) searchParams.append("category", params.category);
  const query = searchParams.toString();
  return apiClient.get<FaqEntry[]>(`/faq${query ? `?${query}` : ""}`);
}

export function listFaqArray(): Promise<FaqEntry[]> {
  return listFaq();
}

export function listFaqAdmin(params?: { skip?: number; take?: number }): Promise<FaqAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  const url = query ? "/faq/admin?" + query : "/faq/admin";
  return apiClient.get<FaqAdminListResponse>(url);
}

export interface FaqWriteInput {
  question: string;
  answer: string;
  category?: string;
  order?: number;
}

// Endpoint: POST /faq
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: FaqEntryAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden)
export function createFaq(data: FaqWriteInput): Promise<FaqEntryAdmin> {
  return apiClient.post<FaqEntryAdmin>("/faq", data);
}

// Endpoint: PATCH /faq/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: FaqEntryAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function updateFaq(id: string, data: Partial<FaqWriteInput>): Promise<FaqEntryAdmin> {
  return apiClient.patch<FaqEntryAdmin>("/faq/" + id, data);
}

// BACKEND API REQUIRED - Delete FAQ
// Endpoint: DELETE /faq/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteFaq(id: string): Promise<void> {
  return apiClient.delete<void>("/faq/" + id);
}
