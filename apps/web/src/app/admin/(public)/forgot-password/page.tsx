import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/admin/forgot-password-form";

export const metadata: Metadata = { title: "Forgot Password" };

export default function AdminForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-medium text-stone-900">Reset Your Password</h1>
        <p className="text-sm text-stone-600">
          Enter the email address on your account and we&apos;ll send you a link to reset your password.
        </p>
      </div>
      <ForgotPasswordForm />
    </main>
  );
}
