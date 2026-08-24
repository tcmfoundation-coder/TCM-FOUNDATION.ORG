"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { GoogleIcon } from "./google-icon";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  email: z.string().min(1, "Email address is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_account_not_provisioned:
    "No TCM Foundation account is linked to this Google account. Ask a Super Administrator to create one first.",
};
const GOOGLE_ERROR_FALLBACK = "Google sign-in failed. Please try again or sign in with your email and password.";

export function LoginForm({
  googleEnabled,
  googleError,
  sessionExpired,
}: {
  googleEnabled: boolean;
  googleError?: string;
  /** Landed here via api-client's terminal-401 redirect — the session (not the password) is why they're back here. */
  sessionExpired?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "session-expired">(
    googleError ? "error" : sessionExpired ? "session-expired" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string>(
    googleError ? (GOOGLE_ERROR_MESSAGES[googleError] ?? GOOGLE_ERROR_FALLBACK) : "",
  );
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setStatus("loading");
    try {
      const { mfaRequired } = await login(values.email, values.password);
      if (mfaRequired) {
        router.push("/admin/mfa-verify");
        return;
      }
      // Sign-in without MFA. Same reasoning as mfa-verify-form.tsx: the
      // login page redirects once a session exists, so refreshing the current
      // route re-renders the shared admin layout with the new session and
      // carries us to the dashboard in one server round trip. Pushing first
      // would aim the refresh at the route being left.
      router.refresh();
    } catch (error) {
      setErrorMessage("Invalid email or password.");
      setStatus("error");
      if (!(error instanceof ApiError)) throw error;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {status === "error" && <Alert variant="error">{errorMessage}</Alert>}
      {status === "session-expired" && <Alert variant="info">Your session expired. Please sign in again.</Alert>}

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
        <Input
          label="Email"
          type="email"
          placeholder="you@email.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <div className="flex flex-col gap-2">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            error={errors.password?.message}
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-stone-400 hover:text-stone-600"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </button>
            }
            {...register("password")}
          />
          <Link href="/admin/forgot-password" className="self-end text-sm text-brand-700 hover:text-brand-800">
            Forgot password?
          </Link>
        </div>

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
          {/* Same-origin via next.config.ts's /api-proxy rewrite, not the API
              origin directly — Google's callback must land on this same
              origin for the session cookies to end up first-party. See
              google.strategy.ts's callbackURL comment for the full reason. */}
          <a href="/api-proxy/auth/google" className="w-full">
            <Button type="button" variant="secondary" className="w-full justify-center">
              <GoogleIcon className="size-4" />
              Continue with Google
            </Button>
          </a>
        </>
      )}
    </div>
  );
}
