"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "../ui/badge";
import { ErrorState } from "../ui/error-state";
import { Skeleton } from "../ui/skeleton";
import { ChangePasswordForm } from "./change-password-form";
import { LogoutButton } from "./logout-button";
import { getMyRoles, type MyRoles } from "@/lib/api/roles";
import { ApiError } from "@/lib/api-client";

const ROLE_LABELS: Record<string, string> = {
  CONTENT_EDITOR: "Content Editor",
  ADMINISTRATOR: "Administrator",
  SUPER_ADMINISTRATOR: "Super Administrator",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_MFA: "Pending MFA",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

export function ProfilePage() {
  const [profile, setProfile] = useState<MyRoles | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyRoles();
      setProfile(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // `load` is also called from the error state's retry action below — its
    // setState calls only ever run after an `await`, never synchronously
    // during this effect, so there's no render-cascade risk despite the
    // rule's shared-function heuristic (see application-submissions-list.tsx
    // for the same pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <ErrorState title="Couldn't load your profile" description={error ?? undefined} onRetry={() => void load()} />
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <section className="flex flex-col gap-6">
        <h2 className="font-display text-lg font-medium text-stone-900">Profile</h2>

        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <User className="size-7" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-stone-900">{profile.email}</p>
            <p className="text-sm text-stone-500">
              Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
            </p>
          </div>
        </div>

        <p className="rounded-sm border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-500">
          Profile photo uploads aren&apos;t available yet.
        </p>

        <dl className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <dt className="text-stone-500">Email Status</dt>
            <dd className="mt-1 text-stone-900">{profile.emailVerifiedAt ? "Verified" : "Not verified"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Roles</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {profile.roles.length === 0 ? (
                <span className="text-stone-900">No roles assigned</span>
              ) : (
                profile.roles.map((r) => (
                  <Badge key={r.role} tone={r.status === "ACTIVE" ? "brand" : "neutral"}>
                    {ROLE_LABELS[r.role] ?? r.role} · {STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                ))
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-6 border-t border-stone-200 pt-8">
        <h2 className="font-display text-lg font-medium text-stone-900">Security</h2>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {profile.mfaEnabled ? (
            <>
              <ShieldCheck className="size-4 text-success" aria-hidden="true" />
              <span className="text-stone-700">Two-factor authentication is enabled.</span>
            </>
          ) : (
            <>
              <ShieldAlert className="size-4 text-warning" aria-hidden="true" />
              <span className="text-stone-700">Two-factor authentication is not set up.</span>
              <Link href="/admin/mfa-setup" className="text-brand-700 hover:text-brand-800">
                Set up now
              </Link>
            </>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-stone-800">Change Password</h3>
          <div className="mt-3">
            <ChangePasswordForm />
          </div>
        </div>

        <div className="border-t border-stone-200 pt-6">
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}
