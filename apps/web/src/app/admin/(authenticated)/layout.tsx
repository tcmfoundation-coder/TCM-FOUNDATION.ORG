import { redirect } from "next/navigation";
import { serverAuthFetch } from "@/lib/server-auth-fetch";

// Requires a valid session, nothing more — deliberately does NOT require an
// ACTIVE privileged role, because both pages in this group are legitimate
// destinations for an authenticated user who isn't (yet, or ever) an admin:
// mfa-setup is how a PENDING_MFA role activates, and dashboard is where an
// authenticated non-admin gets an honest access-denied message rather than
// a silent redirect loop. Real content-management pages live under
// (privileged) instead, which does require an ACTIVE role.
export default async function AdminAuthenticatedLayout({
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

  return <>{children}</>;
}
