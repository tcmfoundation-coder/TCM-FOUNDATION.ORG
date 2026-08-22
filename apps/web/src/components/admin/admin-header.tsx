"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, ShieldCheck, ShieldAlert, User, UserCircle } from "lucide-react";
import { LogoutButton } from "./logout-button";
import { Breadcrumbs } from "../ui/breadcrumbs";
import { findNavItemForPath } from "@/lib/admin-nav";
import type { MyRoles } from "@/lib/api/roles";

const ROLE_LABELS: Record<string, string> = {
  CONTENT_EDITOR: "Content Editor",
  ADMINISTRATOR: "Administrator",
  SUPER_ADMINISTRATOR: "Super Administrator",
};

export function AdminHeader({ user }: { user: MyRoles }) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  const activeRoles = user.roles.filter((r) => r.status === "ACTIVE");
  const primaryRoleLabel =
    activeRoles.length > 0 ? ROLE_LABELS[activeRoles[0].role] ?? activeRoles[0].role : "No active role";

  const navItem = findNavItemForPath(pathname);
  const pageTitle = navItem?.label ?? "Dashboard";
  // Only "Admin" links anywhere — the intermediate group label ("Content",
  // "Operations"...) has no hub page of its own, so it renders as plain text.
  const breadcrumbItems = navItem
    ? [
        { label: "Admin", href: "/admin/dashboard" },
        ...navItem.breadcrumb.map((label) => ({ label })),
      ]
    : [{ label: "Admin" }];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6">
      <div className="flex min-w-0 flex-col justify-center gap-0.5">
        <Breadcrumbs items={breadcrumbItems} />
        <h1 className="truncate font-display text-lg font-medium text-stone-900">{pageTitle}</h1>
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setProfileOpen((open) => !open)}
          className="flex items-center gap-3 rounded-sm px-2.5 py-2 text-sm hover:bg-stone-50"
          aria-expanded={profileOpen}
          aria-haspopup="true"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <User className="size-4" aria-hidden="true" />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block font-medium text-stone-900">{user.email}</span>
            <span className="block text-xs text-stone-500">{primaryRoleLabel}</span>
          </span>
          <ChevronDown className="size-4 text-stone-400" aria-hidden="true" />
        </button>

        {profileOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setProfileOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-stone-200 bg-white py-2 shadow-lg">
              <div className="border-b border-stone-100 px-4 py-3">
                <p className="truncate text-sm font-medium text-stone-900">{user.email}</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {user.roles.length === 0 && <p className="text-xs text-stone-500">No active role</p>}
                  {user.roles.map((role) => (
                    <span key={role.role} className="text-xs text-stone-600">
                      {ROLE_LABELS[role.role] ?? role.role}
                      <span className="text-stone-400"> · {role.status.replace("_", " ")}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
                  {user.mfaEnabled ? (
                    <>
                      <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
                      Two-factor authentication on
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="size-3.5 text-warning" aria-hidden="true" />
                      Two-factor authentication not set up
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-0.5 px-2 pt-1.5">
                <Link
                  href="/admin/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  <UserCircle className="size-4" aria-hidden="true" />
                  My Profile
                </Link>
                <LogoutMenuAction />
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function LogoutMenuAction() {
  return (
    <div className="flex items-center gap-2 px-2 text-stone-700">
      <LogOut className="size-4" aria-hidden="true" />
      <LogoutButton />
    </div>
  );
}
