import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { MyRoles } from "@/lib/api/roles";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { LogoutButton } from "./logout-button";
import { AccessDenied } from "./access-denied";

export function DashboardContent({ data }: { data: MyRoles }) {
  const pendingRoles = data.roles.filter((r) => r.status === "PENDING_MFA");
  const activeRoles = data.roles.filter((r) => r.status === "ACTIVE");

  // An authenticated account with no role grant at all (or only
  // expired/revoked ones) has nothing to do here — a real access-denied
  // response, not a dashboard shell with an empty roles list.
  if (data.roles.length === 0) {
    return <AccessDenied />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-stone-900">Dashboard</h1>
        <LogoutButton />
      </div>

      {pendingRoles.length > 0 && (
        <div className="flex items-start gap-3 rounded-sm border border-warning/30 bg-warning/5 p-4">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="flex flex-col gap-2">
            <p className="text-sm text-stone-800">
              Complete two-factor authentication setup to activate your{" "}
              {pendingRoles.map((r) => r.role).join(", ")} role.
            </p>
            <a href="/admin/mfa-setup" className="w-fit">
              <Button size="sm">Set Up Now</Button>
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Your Roles</h2>
        {data.roles.length === 0 ? (
          <p className="text-sm text-stone-500">No roles assigned yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.roles.map((role) => (
              <li key={role.role} className="flex items-center gap-3">
                {role.status === "ACTIVE" ? (
                  <ShieldCheck aria-hidden="true" className="size-4 text-success" />
                ) : (
                  <ShieldAlert aria-hidden="true" className="size-4 text-warning" />
                )}
                <span className="text-sm text-stone-800">{role.role}</span>
                <Badge tone={role.status === "ACTIVE" ? "neutral" : "brand"}>{role.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeRoles.length > 0 && (
        <p className="text-sm text-stone-500">
          Content management screens are being built out — this is the initial admin dashboard, not the full CMS.
        </p>
      )}
    </div>
  );
}
