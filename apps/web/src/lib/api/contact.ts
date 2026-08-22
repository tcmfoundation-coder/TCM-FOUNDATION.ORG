import { apiClient } from "../api-client";

export interface ContactSubmissionInput {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  subject: string;
  message: string;
  // Omitted rather than sent as null when the challenge isn't configured —
  // the API skips verification in that case and rejects unknown fields.
  turnstileToken?: string;
}

export function submitContactForm(input: ContactSubmissionInput): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>("/contact", input);
}

// Shape returned by GET /contact, GET /contact/:id (admin only).
export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  subject: string;
  message: string;
  createdAt: string;
}

export interface ContactSubmissionListResponse {
  items: ContactSubmission[];
  total: number;
  skip: number;
  take: number;
}

// Endpoint: GET /contact
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: ContactSubmissionListResponse
// Errors: 401 (unauthenticated), 403 (forbidden)
export function listContactSubmissions(params?: { skip?: number; take?: number }): Promise<ContactSubmissionListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  return apiClient.get<ContactSubmissionListResponse>(`/contact${query ? `?${query}` : ""}`);
}

// Endpoint: GET /contact/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: ContactSubmission
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function getContactSubmissionById(id: string): Promise<ContactSubmission> {
  return apiClient.get<ContactSubmission>(`/contact/${id}`);
}
