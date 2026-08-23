"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ShieldAlert, ShieldCheck, ShieldOff, ShieldX } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { EmptyState } from "../ui/empty-state";
import { assignRole, revokeRole } from "@/lib/api/roles";
import {
  deactivateStaffUser,
  reactivateStaffUser,
  type PrivilegedRole,
  type StaffUser,
} from "@/lib/api/users";
import { ApiError } from "@/lib/api-client";
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
  const [deactivateTarget, setDeactivateTarget] = useState<StaffUser | null>(null);

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

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    const userId = deactivateTarget.id;
    setPendingAction(`${userId}:deactivate`);
    setActionError(null);
    try {
      await deactivateStaffUser(userId);
      setDeactivateTarget(null);
      router.refresh();
    } catch (error) {
      // Surfaced verbatim: the API's own message covers the specific reasons
      // this can fail (last Super Administrator, self-deactivation), and a
      // generic fallback would hide exactly the information the admin needs.
      setActionError(
        error instanceof ApiError ? error.message : "Couldn't deactivate this account. Please try again.",
      );
      setDeactivateTarget(null);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReactivate(userId: string) {
    const key = `${userId}:reactivate`;
    setPendingAction(key);
    setActionError(null);
    try {
      await reactivateStaffUser(userId);
      router.refresh();
    } catch {
      setActionError("Couldn't reactivate this account. Please try again.");
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
                <tr key={user.id} className={user.deactivatedAt ? "opacity-60" : undefined}>
                  <td className="px-4 py-3 align-top text-stone-800">
                    <div className="flex items-center gap-2">
                      <span>{user.email}</span>
                      {user.deactivatedAt && <Badge tone="brand">Deactivated</Badge>}
                    </div>
                  </td>
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
                            disabled={pendingAction !== null || Boolean(user.deactivatedAt)}
                            onClick={() => void handleAssign(user.id, role)}
                            className="rounded-sm border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:border-brand-700 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            + {ROLE_LABELS[role]}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2">
                        {user.deactivatedAt ? (
                          <button
                            type="button"
                            disabled={pendingAction !== null}
                            onClick={() => void handleReactivate(user.id)}
                            className="text-xs text-stone-700 underline decoration-dotted disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={pendingAction !== null || user.id === currentUserId}
                            title={user.id === currentUserId ? "You can't deactivate your own account" : undefined}
                            onClick={() => setDeactivateTarget(user)}
                            className="text-xs text-error underline decoration-dotted disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Deactivate
                          </button>
                        )}
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

      {canManage && (
        <Modal open={deactivateTarget !== null} onClose={() => setDeactivateTarget(null)} title="Deactivate account">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-stone-700">
              {deactivateTarget && (
                <>
                  <strong>{deactivateTarget.email}</strong> will immediately lose access — their current session
                  ends and they can&apos;t sign back in until an administrator reactivates the account.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeactivateTarget(null)}>
                Cancel
              </Button>
              <button
                type="button"
                disabled={pendingAction !== null}
                onClick={() => void confirmDeactivate()}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-error px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-error/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:pointer-events-none disabled:opacity-50"
              >
                {pendingAction === `${deactivateTarget?.id}:deactivate` && (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                )}
                Deactivate
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
