"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  email: z.string().min(1, "Email address is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setStatus("loading");
    try {
      const { mfaRequired } = await login(values.email, values.password);
      router.push(mfaRequired ? "/admin/mfa-verify" : "/admin/dashboard");
    } catch (error) {
      setStatus("error");
      if (!(error instanceof ApiError)) throw error;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {status === "error" && <Alert variant="error">Invalid email or password.</Alert>}

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
        <Input label="Email Address" type="email" error={errors.email?.message} {...register("email")} />
        <Input label="Password" type="password" error={errors.password?.message} {...register("password")} />
        <Button type="submit" disabled={status === "loading"} className="justify-center">
          {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Sign In
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <div className="h-px flex-1 bg-stone-200" />
            OR
            <div className="h-px flex-1 bg-stone-200" />
          </div>
          <a href={`${API_BASE_URL}/auth/google`} className="w-full">
            <Button type="button" variant="secondary" className="w-full justify-center">
              Sign in with Google
            </Button>
          </a>
        </>
      )}
    </div>
  );
}
