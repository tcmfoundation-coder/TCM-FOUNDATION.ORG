import { apiClient } from "../api-client";
import type { MediaRef } from "./media-ref";

export type TeamMemberKind = "TEAM" | "BOARD" | "ADVISORY";

// Shape returned by the public GET /team endpoint.
export interface TeamMember {
  id: string;
  kind: TeamMemberKind;
  name: string;
  title: string;
  bio: string | null;
  photo: MediaRef | null;
}

// Shape returned by GET /team/admin.
export interface TeamMemberAdmin extends TeamMember {
  photoId: string | null;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberAdminListResponse {
  items: TeamMemberAdmin[];
  total: number;
  skip: number;
  take: number;
}

// GET /team returns a plain array, not a {items,...} envelope — the public
// route only accepts a `kind` filter, no pagination.
export function listTeam(params?: { kind?: TeamMemberKind }): Promise<TeamMember[]> {
  const url = params?.kind ? `/team?kind=${params.kind}` : "/team";
  return apiClient.get<TeamMember[]>(url);
}

export function listTeamAdmin(params?: { skip?: number; take?: number; kind?: TeamMemberKind }): Promise<TeamMemberAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  if (params?.kind) searchParams.append("kind", params.kind);
  const query = searchParams.toString();
  const url = query ? `/team/admin?${query}` : "/team/admin";
  return apiClient.get<TeamMemberAdminListResponse>(url);
}

// Note: isPublished has no write path — Create/UpdateTeamMemberDto don't
// accept it, even though it's readable via ADMIN_SELECT.
export interface TeamMemberWriteInput {
  kind: TeamMemberKind;
  name: string;
  title: string;
  bio?: string;
  photoId?: string | null;
  order?: number;
}

// Endpoint: POST /team
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Response: TeamMemberAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden)
export function createTeamMember(data: TeamMemberWriteInput): Promise<TeamMemberAdmin> {
  return apiClient.post<TeamMemberAdmin>("/team", data);
}

// Endpoint: PATCH /team/:id
// Authentication: Required
// Required role: CONTENT_EDITOR or higher
// Request: Same as create (all fields optional)
// Response: TeamMemberAdmin
// Errors: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function updateTeamMember(id: string, data: Partial<TeamMemberWriteInput>): Promise<TeamMemberAdmin> {
  return apiClient.patch<TeamMemberAdmin>("/team/" + id, data);
}

// BACKEND API REQUIRED - Delete Team Member
// Endpoint: DELETE /team/:id
// Authentication: Required
// Required role: ADMINISTRATOR or higher
// Response: 204 No Content
// Errors: 401 (unauthenticated), 403 (forbidden), 404 (not found)
export function deleteTeamMember(id: string): Promise<void> {
  return apiClient.delete<void>("/team/" + id);
}
