import { serverAuthFetch } from "@/lib/server-auth-fetch";
import { AdminNav } from "@/components/admin/admin-nav";
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
    <div className="min-h-screen bg-stone-50">
      <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-6 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- static
            brand SVG, no benefit from next/image's raster optimization */}
        <img src="/brand/tcm-logo-purple.svg" alt="TCM Foundation" className="h-6 w-auto" />
        <span className="text-sm font-medium text-stone-700">Admin</span>
      </div>
      {me && <AdminNav roles={me.roles} />}
      {children}
    </div>
  );
}
