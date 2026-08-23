import { apiClient } from "../api-client";
import type { MyRoles } from "./roles";

export type PrivilegedRole = "CONTENT_EDITOR" | "ADMINISTRATOR" | "SUPER_ADMINISTRATOR";

export interface StaffUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  createdAt: string;
  deactivatedAt: string | null;
  roles: MyRoles["roles"];
}

export interface StaffList {
  items: StaffUser[];
  total: number;
  skip: number;
  take: number;
}

export function listStaff(): Promise<StaffList> {
  return apiClient.get<StaffList>("/users?take=100", { revalidateSeconds: 0 });
}

export function createStaffUser(input: {
  email: string;
  temporaryPassword: string;
  initialRole?: PrivilegedRole;
}): Promise<StaffUser & { emailDelivered: boolean }> {
  return apiClient.post<StaffUser & { emailDelivered: boolean }>("/users", input);
}

export function deactivateStaffUser(userId: string): Promise<StaffUser> {
  return apiClient.delete<StaffUser>(`/users/${userId}`);
}

export function reactivateStaffUser(userId: string): Promise<StaffUser> {
  return apiClient.post<StaffUser>(`/users/${userId}/reactivate`);
}
