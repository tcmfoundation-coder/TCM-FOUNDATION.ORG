import { apiClient } from "../api-client";

export type OpportunityType = "CAREER" | "BUSINESS" | "EDUCATION";

export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: OpportunityType;
  deadline: string | null;
  externalApplyUrl: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityListResponse {
  items: Opportunity[];
  total: number;
  skip: number;
  take: number;
}

export function listOpportunities(params?: { skip?: number; take?: number; type?: OpportunityType }): Promise<OpportunityListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  if (params?.type) searchParams.append("type", params.type);
  const query = searchParams.toString();
  const url = query ? "/opportunities?" + query : "/opportunities";
  return apiClient.get<OpportunityListResponse>(url);
}

export function listOpportunitiesArray(type?: OpportunityType): Promise<Opportunity[]> {
  return listOpportunities({ take: 100, type }).then((response) => response.items);
}

// Endpoint: GET /opportunities/admin
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Unlike the public list, this returns drafts as well as published entries —
// the admin CMS has to show both and drive the publish toggle.
export function listOpportunitiesAdmin(params?: {
  skip?: number;
  take?: number;
  type?: OpportunityType;
}): Promise<OpportunityListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  if (params?.type) searchParams.append("type", params.type);
  const query = searchParams.toString();
  return apiClient.get<OpportunityListResponse>(`/opportunities/admin${query ? `?${query}` : ""}`);
}

export function getOpportunityBySlug(slug: string): Promise<Opportunity> {
  return apiClient.get<Opportunity>("/opportunities/" + slug);
}

export function getOpportunityById(id: string): Promise<Opportunity> {
  return apiClient.get<Opportunity>("/opportunities/id/" + id);
}

// Endpoint: POST /opportunities
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: { slug, title, description, type, deadline?, externalApplyUrl }
// Response: Opportunity
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 409 (duplicate slug)
export function createOpportunity(data: Partial<Opportunity>): Promise<Opportunity> {
  return apiClient.post<Opportunity>("/opportunities", data);
}

// Endpoint: PATCH /opportunities/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: Opportunity
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (duplicate slug)
export function updateOpportunity(id: string, data: Partial<Opportunity>): Promise<Opportunity> {
  return apiClient.patch<Opportunity>("/opportunities/" + id, data);
}

// Endpoint: DELETE /opportunities/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteOpportunity(id: string): Promise<void> {
  return apiClient.delete<void>("/opportunities/" + id);
}

// Endpoint: PATCH /opportunities/:id/publish
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: { isPublished: boolean }
// Response: Opportunity
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function publishOpportunity(id: string, isPublished: boolean): Promise<Opportunity> {
  return apiClient.patch<Opportunity>("/opportunities/" + id + "/publish", { isPublished });
}
