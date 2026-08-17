import { redirect } from "next/navigation";
import { serverAuthFetch } from "@/lib/server-auth-fetch";

// Bare /admin has no content of its own — it only decides where to send
// the visitor. Never treat "knowing this URL" as meaningful: an
// unauthenticated visitor is bounced straight to the login flow, and an
// authenticated one goes to the dashboard, which is itself gated (see
// (authenticated)/layout.tsx) and shows the correct state for whatever
// that account is actually authorized to do.
export default async function AdminRootPage() {
  const res = await serverAuthFetch("/roles/me");
  redirect(res.status === 401 ? "/admin/login" : "/admin/dashboard");
}
