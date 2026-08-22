import { apiClient } from "../api-client";
import type { MediaRef } from "./media-ref";

// Shape returned by the public GET /partners endpoint.
export interface Partner {
  id: string;
  name: string;
  websiteUrl: string | null;
  logo: MediaRef | null;
}

// Shape returned by GET /partners/admin.
export interface PartnerAdmin extends Partner {
  logoId: string | null;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerAdminListResponse {
  items: PartnerAdmin[];
  total: number;
  skip: number;
  take: number;
}

// GET /partners returns a plain array, not a {items,...} envelope — the
// public route takes no pagination params.
export function listPartners(): Promise<Partner[]> {
  return apiClient.get<Partner[]>("/partners");
}

export function listPartnersArray(): Promise<Partner[]> {
  return listPartners();
}

export function listPartnersAdmin(params?: { skip?: number; take?: number }): Promise<PartnerAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  const url = query ? "/partners/admin?" + query : "/partners/admin";
  return apiClient.get<PartnerAdminListResponse>(url);
}

// Note: isPublished has no write path — Create/UpdatePartnerDto don't
// accept it, even though it's readable via ADMIN_SELECT.
export interface PartnerWriteInput {
  name: string;
  websiteUrl?: string;
  logoId?: string | null;
  order?: number;
}

// Endpoint: POST /partners
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: PartnerAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden)
export function createPartner(data: PartnerWriteInput): Promise<PartnerAdmin> {
  return apiClient.post<PartnerAdmin>("/partners", data);
}

// Endpoint: PATCH /partners/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: PartnerAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function updatePartner(id: string, data: Partial<PartnerWriteInput>): Promise<PartnerAdmin> {
  return apiClient.patch<PartnerAdmin>("/partners/" + id, data);
}

// BACKEND API REQUIRED - Delete Partner
// Endpoint: DELETE /partners/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deletePartner(id: string): Promise<void> {
  return apiClient.delete<void>("/partners/" + id);
}
