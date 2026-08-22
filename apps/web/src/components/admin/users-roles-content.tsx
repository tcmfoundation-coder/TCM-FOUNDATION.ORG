"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldAlert, ShieldCheck, ShieldOff, ShieldX } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { EmptyState } from "../ui/empty-state";
import { assignRole, revokeRole } from "@/lib/api/roles";
import { type PrivilegedRole, type StaffUser } from "@/lib/api/users";
import { CreateStaffUserForm } from "./create-staff-user-form";

const ALL_ROLES: PrivilegedRole[] = ["CONTENT_EDITOR", "ADMINISTRATOR", "SUPER_ADMINISTRATOR"];

const ROLE_LABELS: Record<PrivilegedRole, string> = {
  CONTENT_EDITOR: "Content Editor",
  ADMINISTRATOR: "Administrator",
  SUPER_ADMINISTRATOR: "Super Administrator",
};

const STATUS_ICON = {
  ACTIVE: ShieldCheck,
  PENDING_MFA: ShieldAlert,
  EXPIRED: ShieldX,
  REVOKED: ShieldOff,
} as const;

function assignableRoles(user: StaffUser): PrivilegedRole[] {
  return ALL_ROLES.filter((role) => {
    const existing = user.roles.find((r) => r.role === role);
    return !existing || existing.status === "REVOKED" || existing.status === "EXPIRED";
  });
}

export function UsersRolesContent({
  initialUsers,
  canManage,
  currentUserId,
}: {
  initialUsers: StaffUser[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAssign(userId: string, role: PrivilegedRole) {
    const key = `${userId}:${role}:assign`;
    setPendingAction(key);
    setActionError(null);
    try {
      await assignRole(userId, role);
      router.refresh();
    } catch {
      setActionError(`Couldn't assign ${ROLE_LABELS[role]}. Please try again.`);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRevoke(userId: string, role: PrivilegedRole) {
    const key = `${userId}:${role}:revoke`;
    setPendingAction(key);
    setActionError(null);
    try {
      await revokeRole(userId, role);
      router.refresh();
    } catch {
      setActionError(`Couldn't revoke ${ROLE_LABELS[role]}. Please try again.`);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-stone-600">
          {canManage
            ? "Manage staff accounts and privileged role assignment."
            : "Staff accounts and their role status (view only)."}
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Add Staff Member
          </Button>
        )}
      </div>

      {actionError && <p className="text-sm text-error">{actionError}</p>}

      {initialUsers.length === 0 ? (
        <EmptyState title="No staff accounts yet" description="Staff accounts created here will appear in this list." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-stone-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">MFA</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                {canManage && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {initialUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 align-top text-stone-800">{user.email}</td>
                  <td className="px-4 py-3 align-top text-stone-600">{user.mfaEnabled ? "Enabled" : "Not set up"}</td>
                  <td className="px-4 py-3 align-top">
                    {user.roles.length === 0 ? (
                      <span className="text-stone-400">None</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {user.roles.map((r) => {
                          const Icon = STATUS_ICON[r.status];
                          return (
                            <div key={r.role} className="flex items-center gap-2">
                              <Icon
                                aria-hidden="true"
                                className={`size-3.5 shrink-0 ${
                                  r.status === "ACTIVE" ? "text-success" : "text-stone-400"
                                }`}
                              />
                              <span className="text-stone-700">{ROLE_LABELS[r.role as PrivilegedRole]}</span>
                              <Badge tone={r.status === "ACTIVE" ? "neutral" : "brand"}>{r.status}</Badge>
                              {canManage && (r.status === "ACTIVE" || r.status === "PENDING_MFA") && (
                                <button
                                  type="button"
                                  disabled={
                                    pendingAction !== null ||
                                    (user.id === currentUserId && r.role === "SUPER_ADMINISTRATOR")
                                  }
                                  title={
                                    user.id === currentUserId && r.role === "SUPER_ADMINISTRATOR"
                                      ? "You can't revoke your own Super Administrator role"
                                      : undefined
                                  }
                                  onClick={() => void handleRevoke(user.id, r.role as PrivilegedRole)}
                                  className="text-xs text-error underline decoration-dotted disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        {assignableRoles(user).map((role) => (
                          <button
                            key={role}
                            type="button"
                            disabled={pendingAction !== null}
                            onClick={() => void handleAssign(user.id, role)}
                            className="rounded-sm border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:border-brand-700 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            + {ROLE_LABELS[role]}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Staff Member">
          <CreateStaffUserForm
            onCreated={() => {
              setCreateOpen(false);
              router.refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
