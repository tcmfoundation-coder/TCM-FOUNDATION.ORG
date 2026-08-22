"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV_GROUPS, hasAnyRole } from "@/lib/admin-nav";
import type { MyRoles } from "@/lib/api/roles";

export function AdminSidebar({ roles }: { roles: MyRoles["roles"] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeRoleNames = new Set(roles.filter((r) => r.status === "ACTIVE").map((r) => r.role));

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasAnyRole(activeRoleNames, item.roles)),
  })).filter((group) => group.items.length > 0);

  if (visibleGroups.length <= 1 && visibleGroups[0]?.items.length <= 1) return null;

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-brand-600 p-3 text-white shadow-lg hover:bg-brand-700 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — h-full + min-h-0 so `nav` below can scroll independently
          of the main content area rather than growing the whole document. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 min-h-0 shrink-0 transform flex-col border-r border-stone-200 bg-white transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 px-5">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
            <img src="/brand/tcm-logo-purple.svg" alt="TCM Foundation" className="h-5 w-auto" />
            <span className="text-sm font-medium text-stone-500">Admin</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-sm p-1 text-stone-500 hover:bg-stone-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Admin navigation">
          <div className="flex flex-col gap-5">
            {visibleGroups.map((group) => (
              <div key={group.key}>
                <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-wide text-stone-400">
                  {group.label}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-brand-50 text-brand-700"
                              : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                          }`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 border-t border-stone-200 px-5 py-3">
          <p className="text-xs text-stone-400">TCM Foundation Admin</p>
        </div>
      </aside>
    </>
  );
}
