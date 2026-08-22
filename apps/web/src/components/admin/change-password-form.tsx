"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button, buttonStyles } from "../ui/button";
import { Alert } from "../ui/alert";
import { changePassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api-client";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(12, "Password must be at least 12 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;
type Status = "idle" | "loading" | "success" | "error";

export function ChangePasswordForm() {
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
      await changePassword(values.currentPassword, values.newPassword);
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError && error.status === 401
          ? "Your current password is incorrect."
          : "Couldn't change your password right now. Please try again.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">
          Your password has been changed and every active session has been signed out for your security.
        </Alert>
        <Link href="/admin/login" className={buttonStyles({ variant: "secondary", className: "w-fit" })}>
          Sign In Again
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
      {status === "error" && <Alert variant="error">{errorMessage}</Alert>}

      <Input
        label="Current Password"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register("currentPassword")}
      />
      <Input
        label="New Password"
        type="password"
        autoComplete="new-password"
        hint="At least 12 characters."
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
      <Button type="submit" disabled={status === "loading"} className="w-fit">
        {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        Change Password
      </Button>
    </form>
  );
}
