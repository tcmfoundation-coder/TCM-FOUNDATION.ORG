import { MfaVerifyForm } from "@/components/admin/mfa-verify-form";

export default function AdminMfaVerifyPage() {
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
