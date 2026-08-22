"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { resetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api-client";

const schema = z
  .object({
    newPassword: z.string().min(12, "Password must be at least 12 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;
type Status = "idle" | "loading" | "success" | "error";

export function ResetPasswordForm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setStatus("loading");
    try {
      await resetPassword(token, values.newPassword);
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? "This reset link is invalid or has expired. Request a new one."
          : "Something went wrong. Please try again.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">
          Your password has been reset. All previous sessions have been signed out for your security.
        </Alert>
        <Link href="/admin/login" className="text-sm text-brand-700 hover:text-brand-800">
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {status === "error" && (
        <div className="flex flex-col gap-2">
          <Alert variant="error">{errorMessage}</Alert>
          <Link href="/admin/forgot-password" className="text-sm text-brand-700 hover:text-brand-800">
            Request a new link
          </Link>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
        <Input
          label="New Password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Input
          label="Confirm New Password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" disabled={status === "loading"} className="justify-center">
          {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Reset Password
        </Button>
      </form>
    </div>
  );
}
