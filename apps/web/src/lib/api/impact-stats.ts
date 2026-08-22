import { apiClient } from "../api-client";

// Shape returned by the public GET /impact-stats endpoint.
export interface ImpactStat {
  id: string;
  label: string;
  value: number;
}

// Shape returned by GET /impact-stats/admin.
export interface ImpactStatAdmin extends ImpactStat {
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImpactStatAdminListResponse {
  items: ImpactStatAdmin[];
  total: number;
  skip: number;
  take: number;
}

// GET /impact-stats returns a plain array, not a {items,...} envelope — the
// backend route takes no pagination params.
export function listImpactStats(): Promise<ImpactStat[]> {
  return apiClient.get<ImpactStat[]>("/impact-stats");
}

export function listImpactStatsArray(): Promise<ImpactStat[]> {
  return listImpactStats();
}

export function listImpactStatsAdmin(params?: { skip?: number; take?: number }): Promise<ImpactStatAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  const url = query ? "/impact-stats/admin?" + query : "/impact-stats/admin";
  return apiClient.get<ImpactStatAdminListResponse>(url);
}

// Note: isPublished has no write path — CreateImpactStatDto/UpdateImpactStatDto
// don't accept it, even though it's readable via ADMIN_SELECT. There is
// currently no way to toggle an impact stat's published state through the API.
export interface ImpactStatWriteInput {
  label: string;
  value: number;
  order?: number;
}

// Endpoint: POST /impact-stats
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: ImpactStatAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden)
export function createImpactStat(data: ImpactStatWriteInput): Promise<ImpactStatAdmin> {
  return apiClient.post<ImpactStatAdmin>("/impact-stats", data);
}

// Endpoint: PATCH /impact-stats/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: ImpactStatAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function updateImpactStat(id: string, data: Partial<ImpactStatWriteInput>): Promise<ImpactStatAdmin> {
  return apiClient.patch<ImpactStatAdmin>("/impact-stats/" + id, data);
}

// BACKEND API REQUIRED - Delete Impact Stat
// Endpoint: DELETE /impact-stats/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteImpactStat(id: string): Promise<void> {
  return apiClient.delete<void>("/impact-stats/" + id);
}
