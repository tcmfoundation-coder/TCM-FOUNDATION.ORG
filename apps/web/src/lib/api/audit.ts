import { apiClient } from "../api-client";

// Mirrors the AuditAction enum in schema.prisma exactly.
export type AuditAction =
  | "ROLE_ASSIGNED"
  | "ROLE_ACTIVATED"
  | "ROLE_REVOKED"
  | "ROLE_ASSIGNMENT_EXPIRED"
  | "ADMIN_LOGIN_SUCCEEDED"
  | "ADMIN_LOGIN_FAILED"
  | "ADMIN_LOGOUT"
  | "MFA_VERIFICATION_SUCCEEDED"
  | "MFA_VERIFICATION_FAILED"
  | "AUTHORIZATION_DENIED"
  | "CONTENT_CREATED"
  | "CONTENT_UPDATED"
  | "CONTENT_DELETED"
  | "MEDIA_UPLOADED"
  | "MEDIA_DELETED"
  | "SUBMISSION_STATUS_CHANGED";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  ROLE_ASSIGNED: "Role Assigned",
  ROLE_ACTIVATED: "Role Activated",
  ROLE_REVOKED: "Role Revoked",
  ROLE_ASSIGNMENT_EXPIRED: "Role Assignment Expired",
  ADMIN_LOGIN_SUCCEEDED: "Admin Login Succeeded",
  ADMIN_LOGIN_FAILED: "Admin Login Failed",
  ADMIN_LOGOUT: "Admin Logout",
  MFA_VERIFICATION_SUCCEEDED: "MFA Verification Succeeded",
  MFA_VERIFICATION_FAILED: "MFA Verification Failed",
  AUTHORIZATION_DENIED: "Authorization Denied",
  CONTENT_CREATED: "Content Created",
  CONTENT_UPDATED: "Content Updated",
  CONTENT_DELETED: "Content Deleted",
  MEDIA_UPLOADED: "Media Uploaded",
  MEDIA_DELETED: "Media Deleted",
  SUBMISSION_STATUS_CHANGED: "Submission Status Changed",
};

// actor is null for unauthenticated events (e.g. a failed login for an
// unknown email) — see auth.service.ts's ADMIN_LOGIN_FAILED calls.
export interface AuditLog {
  id: string;
  actorId: string | null;
  actor: { id: string; email: string } | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  skip: number;
  take: number;
}

export function listAuditLogs(params?: {
  skip?: number;
  take?: number;
  action?: AuditAction;
  entityType?: string;
  actorId?: string;
}): Promise<AuditLogListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  if (params?.action) searchParams.append("action", params.action);
  if (params?.entityType) searchParams.append("entityType", params.entityType);
  if (params?.actorId) searchParams.append("actorId", params.actorId);
  const query = searchParams.toString();
  const url = query ? "/audit-logs?" + query : "/audit-logs";
  return apiClient.get<AuditLogListResponse>(url);
}

export function getAuditLogById(id: string): Promise<AuditLog> {
  return apiClient.get<AuditLog>("/audit-logs/" + id);
}
