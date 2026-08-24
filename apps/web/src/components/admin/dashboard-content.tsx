import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  FolderKanban,
  Newspaper,
  Users,
  ImageIcon,
  UserCog,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MyRoles } from "@/lib/api/roles";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { AccessDenied } from "./access-denied";
import { DashboardAnalyticsSection } from "./dashboard-analytics";

const ROLE_LABELS: Record<string, string> = {
  CONTENT_EDITOR: "Content Editor",
  ADMINISTRATOR: "Administrator",
  SUPER_ADMINISTRATOR: "Super Administrator",
};

interface QuickAction {
  href: string;
  label: string;
  icon: LucideIcon;
}

const CONTENT_ACTIONS: QuickAction[] = [
  { href: "/admin/content/programs", label: "Create Program", icon: FolderKanban },
  { href: "/admin/content/blog", label: "Write Blog Post", icon: Newspaper },
  { href: "/admin/content/team", label: "Add Team Member", icon: Users },
  { href: "/admin/media", label: "Upload Media", icon: ImageIcon },
];

const MANAGEMENT_ACTIONS: QuickAction[] = [
  { href: "/admin/users-roles", label: "Manage Users & Roles", icon: UserCog },
  { href: "/admin/support-requests", label: "Support Requests", icon: MessageSquare },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardContent({ data }: { data: MyRoles }) {
  const pendingRoles = data.roles.filter((r) => r.status === "PENDING_MFA");
  const activeRoles = data.roles.filter((r) => r.status === "ACTIVE");
  const activeRoleNames = activeRoles.map((r) => r.role);
  const canManage = activeRoleNames.includes("ADMINISTRATOR") || activeRoleNames.includes("SUPER_ADMINISTRATOR");

  // An authenticated account with no role grant at all (or only
  // expired/revoked ones) has nothing to do here — a real access-denied
  // response, not a dashboard shell with an empty roles list.
  if (data.roles.length === 0) {
    return <AccessDenied />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl font-medium text-stone-900">
          {greeting()}, {data.email.split("@")[0]}
        </h2>
        <p className="text-sm text-stone-600">Here&apos;s what&apos;s happening across TCM Foundation.</p>
      </div>

      {pendingRoles.length > 0 && (
        <div className="flex items-start gap-3 rounded-sm border border-warning/30 bg-warning/5 p-4">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="flex flex-col gap-2">
            <p className="text-sm text-stone-800">
              Complete two-factor authentication setup to activate your{" "}
              {pendingRoles.map((r) => ROLE_LABELS[r.role] ?? r.role).join(", ")} role.
            </p>
            <Link href="/admin/mfa-setup" className="w-fit">
              <Button size="sm">Set Up Now</Button>
            </Link>
          </div>
        </div>
      )}

      {activeRoles.length > 0 && (
        <>
          <DashboardAnalyticsSection />

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium uppercase tracking-wide text-stone-500">Quick Actions</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {activeRoleNames.includes("CONTENT_EDITOR") &&
                CONTENT_ACTIONS.map((action) => <QuickActionCard key={action.href} action={action} />)}
              {canManage && MANAGEMENT_ACTIONS.map((action) => <QuickActionCard key={action.href} action={action} />)}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium uppercase tracking-wide text-stone-500">Your Roles</h3>
            <ul className="flex flex-col gap-2">
              {data.roles.map((role) => (
                <li key={role.role} className="flex items-center gap-3">
                  {role.status === "ACTIVE" ? (
                    <ShieldCheck aria-hidden="true" className="size-4 text-success" />
                  ) : (
                    <ShieldAlert aria-hidden="true" className="size-4 text-warning" />
                  )}
                  <span className="text-sm text-stone-800">{ROLE_LABELS[role.role] ?? role.role}</span>
                  <Badge tone={role.status === "ACTIVE" ? "neutral" : "brand"}>{role.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {activeRoles.length === 0 && (
        <div className="flex items-start gap-3 rounded-sm border border-stone-200 bg-stone-50 p-4">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-stone-400" />
          <p className="text-sm text-stone-800">
            You have no active roles. Contact a Super Administrator to request access.
          </p>
        </div>
      )}
    </div>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className="flex items-center gap-3 rounded-sm border border-stone-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <span className="text-sm font-medium text-stone-700">{action.label}</span>
    </Link>
  );
}
