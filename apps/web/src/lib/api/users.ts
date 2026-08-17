import { apiClient } from "../api-client";
import type { MyRoles } from "./roles";

export type PrivilegedRole = "CONTENT_EDITOR" | "ADMINISTRATOR" | "SUPER_ADMINISTRATOR";

export interface StaffUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  createdAt: string;
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
}): Promise<StaffUser> {
  return apiClient.post<StaffUser>("/users", input);
}
