import { ShieldOff } from "lucide-react";
import { LogoutButton } from "./logout-button";

// Shown to an authenticated user who holds no administrative role at all —
// deliberately generic. It must not confirm or deny whether this email is
// or was ever an administrator (see the admin access security requirement's
// "do not leak whether a particular email/account belongs to an
// administrator" rule), so it gives no account-specific detail.
export function AccessDenied() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <ShieldOff aria-hidden="true" className="size-10 text-stone-400" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-medium text-stone-900">Access Denied</h1>
        <p className="max-w-sm text-sm text-stone-600">
          Your account doesn&apos;t have administrative access. If you believe this is a
          mistake, contact a Super Administrator.
        </p>
      </div>
      <LogoutButton />
    </div>
  );
}
