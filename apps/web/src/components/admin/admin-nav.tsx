import Link from "next/link";
import type { MyRoles } from "@/lib/api/roles";

type NavLink = { href: string; label: string };

const CONTENT_ROLES = ["CONTENT_EDITOR", "ADMINISTRATOR", "SUPER_ADMINISTRATOR"];
const MANAGEMENT_ROLES = ["ADMINISTRATOR", "SUPER_ADMINISTRATOR"];

// Server-rendered, not client-side role logic: this only decides which
// links are worth *showing* (a CONTENT_EDITOR has no reason to see a link
// to a page RolesGuard will 403 them out of) — the actual authorization
// boundary is unchanged, enforced independently by every page/endpoint
// this links to.
export function AdminNav({ roles }: { roles: MyRoles["roles"] }) {
  const activeRoleNames = new Set(roles.filter((r) => r.status === "ACTIVE").map((r) => r.role));
  const has = (allowed: string[]) => allowed.some((role) => activeRoleNames.has(role));

  const links: NavLink[] = [{ href: "/admin/dashboard", label: "Dashboard" }];

  if (has(CONTENT_ROLES)) {
    links.push({ href: "/admin/content", label: "Content" });
  }
  if (has(MANAGEMENT_ROLES)) {
    links.push(
      { href: "/admin/applications", label: "Applications" },
      { href: "/admin/support-requests", label: "Support Requests" },
      { href: "/admin/users-roles", label: "Users & Roles" },
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/audit-log", label: "Audit Log" },
    );
  }

  if (links.length <= 1) return null;

  return (
    <nav aria-label="Admin" className="border-b border-stone-200 bg-white px-6">
      <div className="mx-auto flex max-w-5xl gap-5 overflow-x-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap border-b-2 border-transparent py-3 text-sm text-stone-600 hover:border-brand-700 hover:text-brand-700"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
