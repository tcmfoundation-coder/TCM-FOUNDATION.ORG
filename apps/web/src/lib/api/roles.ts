import { apiClient } from "../api-client";

export interface MyRoles {
  id: string;
  email: string;
  mfaEnabled: boolean;
  mfaEnrolledAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  roles: {
    role: string;
    status: "PENDING_MFA" | "ACTIVE" | "EXPIRED" | "REVOKED";
    assignedAt: string;
    activatedAt: string | null;
  }[];
}

export function getMyRoles(): Promise<MyRoles> {
  return apiClient.get<MyRoles>("/roles/me", { revalidateSeconds: 0 });
}

export function setupMfa(): Promise<{ secret: string; otpauthUri: string }> {
  return apiClient.post<{ secret: string; otpauthUri: string }>("/roles/mfa/setup");
}

export function verifyMfaEnrollment(code: string): Promise<{ success: true; activatedRoles: string[] }> {
  return apiClient.post<{ success: true; activatedRoles: string[] }>("/roles/mfa/enroll-verify", { code });
}

export function assignRole(userId: string, role: string): Promise<unknown> {
  return apiClient.post("/roles/assign", { userId, role });
}

export function revokeRole(userId: string, role: string): Promise<unknown> {
  return apiClient.post("/roles/revoke", { userId, role });
}
