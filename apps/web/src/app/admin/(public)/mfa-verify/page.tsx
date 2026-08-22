import { MfaVerifyForm } from "@/components/admin/mfa-verify-form";
import { redirectIfSignedIn } from "@/lib/redirect-if-signed-in";

export default async function AdminMfaVerifyPage() {
  // During MFA-pending only the mfa_pending cookie exists, so /roles/me still
  // 401s and the form renders. Once login-verify has issued the real session
  // cookies this redirects instead - which is what turns the form's
  // router.refresh() into the completed navigation to the dashboard.
  await redirectIfSignedIn();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-medium text-stone-900">Two-Factor Verification</h1>
        <p className="text-sm text-stone-600">Enter the code from your authenticator app to continue.</p>
      </div>
      <MfaVerifyForm />
    </main>
  );
}
