import { serverAuthFetch } from "@/lib/server-auth-fetch";
import { UsersRolesContent } from "@/components/admin/users-roles-content";
import { AccessDenied } from "@/components/admin/access-denied";
import type { MyRoles } from "@/lib/api/roles";
import type { StaffList } from "@/lib/api/users";

export default async function AdminUsersRolesPage() {
  const meRes = await serverAuthFetch("/roles/me");
  if (!meRes.ok) {
    throw new Error(`Failed to load session (${meRes.status})`);
  }
  const me = (await meRes.json()) as MyRoles;
  const isSuperAdmin = me.roles.some(
    (r) => r.role === "SUPER_ADMINISTRATOR" && r.status === "ACTIVE",
  );

  const usersRes = await serverAuthFetch("/users?take=100");

  // GET /users requires ADMINISTRATOR or SUPER_ADMINISTRATOR — a
  // CONTENT_EDITOR reaches this route group (it only requires *some*
  // ACTIVE role) but isn't authorized for staff data, so the backend's
  // 403 surfaces here as the same honest access-denied view rather than
  // a raw error.
  if (usersRes.status === 403) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <AccessDenied />
      </main>
    );
  }
  if (!usersRes.ok) {
    throw new Error(`Failed to load staff accounts (${usersRes.status})`);
  }

  const data = (await usersRes.json()) as StaffList;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <UsersRolesContent initialUsers={data.items} canManage={isSuperAdmin} currentUserId={me.id} />
    </main>
  );
}
