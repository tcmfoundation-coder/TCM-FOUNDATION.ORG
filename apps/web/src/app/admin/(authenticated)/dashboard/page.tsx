import { redirect } from "next/navigation";
import { serverAuthFetch } from "@/lib/server-auth-fetch";
import { DashboardContent } from "@/components/admin/dashboard-content";
import type { MyRoles } from "@/lib/api/roles";

export default async function AdminDashboardPage() {
  const res = await serverAuthFetch("/roles/me");

  if (res.status === 401) {
    redirect("/admin/login");
  }
  if (!res.ok) {
    throw new Error(`Failed to load dashboard (${res.status})`);
  }

  const data = (await res.json()) as MyRoles;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <DashboardContent data={data} />
    </main>
  );
}
