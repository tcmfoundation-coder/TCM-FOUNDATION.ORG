import { MfaSetupFlow } from "@/components/admin/mfa-setup-flow";

export default function AdminMfaSetupPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-medium text-stone-900">Set Up Two-Factor Authentication</h1>
        <p className="text-sm text-stone-600">
          Required before your privileged role activates — see the Authentication &amp; Authorization Model.
        </p>
      </div>
      <MfaSetupFlow />
    </main>
  );
}
