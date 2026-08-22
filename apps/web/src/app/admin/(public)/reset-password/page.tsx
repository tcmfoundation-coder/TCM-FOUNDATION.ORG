import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default async function AdminResetPasswordPage({ searchParams }: PageProps<"/admin/reset-password">) {
  const { token } = await searchParams;
  const resetToken = typeof token === "string" ? token : undefined;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-medium text-stone-900">Set a New Password</h1>
        <p className="text-sm text-stone-600">Choose a new password for your account.</p>
      </div>

      {resetToken ? (
        <ResetPasswordForm token={resetToken} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-sm border border-stone-200 bg-stone-50 p-4">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-stone-500" />
            <p className="text-sm text-stone-700">
              This link is missing its reset token. Request a new password reset link and use the link from your
              email exactly as it was sent.
            </p>
          </div>
          <Link href="/admin/forgot-password" className="text-sm text-brand-700 hover:text-brand-800">
            Request a new link
          </Link>
        </div>
      )}
    </main>
  );
}
