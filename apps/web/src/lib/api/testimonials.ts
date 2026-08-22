import { apiClient } from "../api-client";

// Shape returned by the public GET /testimonials endpoint. There is no
// `photoId` field anywhere on the backend (Prisma Testimonial model, DTOs,
// or select shapes) — testimonials have no associated media.
export interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  quote: string;
}

// Shape returned by GET /testimonials/admin.
export interface TestimonialAdmin extends Testimonial {
  order: number;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestimonialAdminListResponse {
  items: TestimonialAdmin[];
  total: number;
  skip: number;
  take: number;
}

// GET /testimonials returns a plain array, not a {items,...} envelope.
export function listTestimonials(take?: number): Promise<Testimonial[]> {
  const url = take ? `/testimonials?take=${take}` : "/testimonials";
  return apiClient.get<Testimonial[]>(url);
}

export function listTestimonialsArray(take?: number): Promise<Testimonial[]> {
  return listTestimonials(take);
}

export function listTestimonialsAdmin(params?: { skip?: number; take?: number }): Promise<TestimonialAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  const url = query ? "/testimonials/admin?" + query : "/testimonials/admin";
  return apiClient.get<TestimonialAdminListResponse>(url);
}

// Note: isApproved has no write path — Create/UpdateTestimonialDto don't
// accept it, even though it's readable via ADMIN_SELECT.
export interface TestimonialWriteInput {
  authorName: string;
  authorRole?: string;
  quote: string;
  order?: number;
}

// Endpoint: POST /testimonials
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: TestimonialAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden)
export function createTestimonial(data: TestimonialWriteInput): Promise<TestimonialAdmin> {
  return apiClient.post<TestimonialAdmin>("/testimonials", data);
}

// Endpoint: PATCH /testimonials/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: TestimonialAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function updateTestimonial(id: string, data: Partial<TestimonialWriteInput>): Promise<TestimonialAdmin> {
  return apiClient.patch<TestimonialAdmin>("/testimonials/" + id, data);
}

// BACKEND API REQUIRED - Delete Testimonial
// Endpoint: DELETE /testimonials/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteTestimonial(id: string): Promise<void> {
  return apiClient.delete<void>("/testimonials/" + id);
}
