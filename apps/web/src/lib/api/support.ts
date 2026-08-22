import { apiClient } from "../api-client";

export type SupportRequestStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface SupportService {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  order: number;
}

export interface SupportRequest {
  id: string;
  serviceId: string;
  service: SupportService;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  message: string;
  status: SupportRequestStatus;
  handledById: string | null;
  handledBy: { id: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportRequestListResponse {
  items: SupportRequest[];
  total: number;
  skip: number;
  take: number;
}

export function listSupportRequests(params?: { skip?: number; take?: number; status?: SupportRequestStatus }): Promise<SupportRequestListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  if (params?.status) searchParams.append("status", params.status);
  const query = searchParams.toString();
  const url = query ? "/support-requests?" + query : "/support-requests";
  return apiClient.get<SupportRequestListResponse>(url);
}

export function getSupportRequestById(id: string): Promise<SupportRequest> {
  return apiClient.get<SupportRequest>("/support-requests/" + id);
}

export function listSupportServices(): Promise<SupportService[]> {
  return apiClient.get<SupportService[]>("/support-services");
}

export interface SubmitSupportRequestInput {
  serviceId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  message: string;
  // Omitted rather than sent as null when the challenge isn't configured —
  // the API skips verification in that case and rejects unknown fields.
  turnstileToken?: string;
}

// Endpoint: POST /support-requests
// Authentication: None (public submission)
// Response: { id, createdAt }
// Errors: 400 (validation), 404 (service not found or inactive)
export function submitSupportRequest(data: SubmitSupportRequestInput): Promise<{ id: string; createdAt: string }> {
  return apiClient.post<{ id: string; createdAt: string }>("/support-requests", data);
}

// Endpoint: PATCH /support-requests/:id/status
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: { status: SupportRequestStatus }
// Response: SupportRequest
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function updateSupportRequestStatus(id: string, status: SupportRequestStatus): Promise<SupportRequest> {
  return apiClient.patch<SupportRequest>("/support-requests/" + id + "/status", { status });
}

// Endpoint: PATCH /support-requests/:id/handler
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: { handledById: string | null }
// Response: SupportRequest
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function assignSupportRequestHandler(id: string, handledById: string | null): Promise<SupportRequest> {
  return apiClient.patch<SupportRequest>("/support-requests/" + id + "/handler", { handledById });
}

// Endpoint: POST /support-services
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Request: { name, description?, isActive?, order? }
// Response: SupportService
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden)
export function createSupportService(data: Partial<SupportService>): Promise<SupportService> {
  return apiClient.post<SupportService>("/support-services", data);
}

// Endpoint: PATCH /support-services/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Request: Same as create (all fields optional)
// Response: SupportService
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function updateSupportService(id: string, data: Partial<SupportService>): Promise<SupportService> {
  return apiClient.patch<SupportService>("/support-services/" + id, data);
}

// Endpoint: DELETE /support-services/:id
// Authentication: Required
// Required role: SUPER_ADMINISTRATOR
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (has existing requests)
export function deleteSupportService(id: string): Promise<void> {
  return apiClient.delete<void>("/support-services/" + id);
}
