import { redirect } from "next/navigation";
import { serverAuthFetch } from "@/lib/server-auth-fetch";
import type { MyRoles } from "@/lib/api/roles";

// The real authorization boundary for content-management/admin-settings
// pages: requires not just a session, but at least one ACTIVE privileged
// role. This is UX only — every API call these pages make is independently
// re-checked server-side by RolesGuard, which is the actual security
// boundary — but it means a signed-in, non-privileged user (or one whose
// role is still PENDING_MFA/EXPIRED/REVOKED) never even sees this chrome;
// they're sent to /admin/dashboard, which explains their status honestly.
export default async function AdminPrivilegedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const res = await serverAuthFetch("/roles/me");

  if (res.status === 401) {
    redirect("/admin/login");
  }
  if (!res.ok) {
    throw new Error(`Failed to verify session (${res.status})`);
  }

  const data = (await res.json()) as MyRoles;
  const hasActiveRole = data.roles.some((r) => r.status === "ACTIVE");

  if (!hasActiveRole) {
    redirect("/admin/dashboard");
  }

  return <>{children}</>;
}
