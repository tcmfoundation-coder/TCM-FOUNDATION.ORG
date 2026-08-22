import { serverAuthFetch } from "@/lib/server-auth-fetch";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { Toaster } from "@/components/ui/toast";
import type { MyRoles } from "@/lib/api/roles";

// Chrome only — deliberately does no auth *gating* itself. The actual
// server-side guards live one level down, in the (public)/(authenticated)/
// (privileged) route group layouts, so that the entry points into the auth
// flow (login, mfa-verify) can render without a session while every other
// /admin route requires one.
//
// It does fetch the session, purely to decide which nav links are worth
// showing — best-effort only. If that fetch fails (API unreachable) this
// falls back to no nav rather than breaking the page; the real security
// boundary is unaffected either way.
async function getMyRolesOrNull(): Promise<MyRoles | null> {
  try {
    const res = await serverAuthFetch("/roles/me");
    if (!res.ok) return null;
    return (await res.json()) as MyRoles;
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getMyRolesOrNull();

  return (
    <div className="h-screen overflow-hidden bg-stone-50">
      <Toaster />
      {me ? (
        <div className="flex h-full">
          <AdminSidebar roles={me.roles} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <AdminHeader user={me} />
            <main className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">{children}</div>
            </main>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-6 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static
                brand SVG, no benefit from next/image's raster optimization */}
            <img src="/brand/tcm-logo-purple.svg" alt="TCM Foundation" className="h-6 w-auto" />
            <span className="text-sm font-medium text-stone-700">Admin</span>
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      )}
    </div>
  );
}
