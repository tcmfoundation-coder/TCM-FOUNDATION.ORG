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
import { requestPasswordReset } from "@/lib/api/auth";

const schema = z.object({
  email: z.string().min(1, "Email address is required").email("Enter a valid email address"),
});
type FormValues = z.infer<typeof schema>;
type Status = "idle" | "loading" | "success" | "error";

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<Status>("idle");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setStatus("loading");
    try {
      // The backend always responds the same way whether or not the email
      // matches an account — this success message must never change based
      // on which case it was, or the endpoint would leak account existence.
      await requestPasswordReset(values.email);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <Alert variant="success">
        If an account exists for that email address, we&apos;ve sent a link to reset your password. It expires in 1
        hour.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {status === "error" && <Alert variant="error">Something went wrong. Please try again.</Alert>}

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
        <Input label="Email Address" type="email" error={errors.email?.message} {...register("email")} />
        <Button type="submit" disabled={status === "loading"} className="justify-center">
          {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Send Reset Link
        </Button>
      </form>

      <Link href="/admin/login" className="text-sm text-brand-700 hover:text-brand-800">
        Back to Sign In
      </Link>
    </div>
  );
}
