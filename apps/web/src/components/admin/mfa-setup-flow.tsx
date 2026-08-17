"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { setupMfa, verifyMfaEnrollment } from "@/lib/api/roles";
import { ApiError } from "@/lib/api-client";

const codeSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code from your authenticator app"),
});
type CodeFormValues = z.infer<typeof codeSchema>;

type Step =
  | { name: "start" }
  | { name: "scan"; secret: string; otpauthUri: string }
  | { name: "already-enabled" }
  | { name: "error" };

// Deliberately not auto-fetched on page load: POST /roles/mfa/setup
// generates and stores a brand-new secret on every call, so an automatic
// fetch (or a React effect re-running) would silently invalidate a QR code
// the user hasn't finished scanning yet. One explicit user action, one
// secret, no surprises.
export function MfaSetupFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "start" });
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading" | "error">("idle");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CodeFormValues>({ resolver: zodResolver(codeSchema) });

  async function beginSetup() {
    try {
      const { secret, otpauthUri } = await setupMfa();
      setStep({ name: "scan", secret, otpauthUri });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setStep({ name: "already-enabled" });
      } else {
        setStep({ name: "error" });
      }
    }
  }

  async function onVerify(values: CodeFormValues) {
    setVerifyStatus("loading");
    try {
      await verifyMfaEnrollment(values.code);
      router.push("/admin/dashboard");
    } catch {
      setVerifyStatus("error");
    }
  }

  if (step.name === "already-enabled") {
    return (
      <Alert variant="info">
        Two-factor authentication is already set up for your account.{" "}
        <a href="/admin/dashboard" className="underline">
          Go to dashboard
        </a>
        .
      </Alert>
    );
  }

  if (step.name === "error") {
    return <Alert variant="error">Something went wrong. Please refresh and try again.</Alert>;
  }

  if (step.name === "start") {
    return <Button onClick={() => void beginSetup()}>Begin Setup</Button>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 rounded-sm border border-stone-200 p-6">
        <QRCodeSVG value={step.otpauthUri} size={180} />
        <p className="text-center text-sm text-stone-600">
          Scan this with your authenticator app, or enter the code manually:
        </p>
        <code className="rounded-sm bg-stone-100 px-3 py-1.5 text-sm font-medium tracking-wider text-stone-800">
          {step.secret}
        </code>
      </div>

      {verifyStatus === "error" && <Alert variant="error">Invalid code. Please try again.</Alert>}

      <form onSubmit={(e) => void handleSubmit(onVerify)(e)} className="flex flex-col gap-5">
        <Input
          label="Enter the 6-digit code to confirm"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={errors.code?.message}
          {...register("code")}
        />
        <Button type="submit" disabled={verifyStatus === "loading"} className="justify-center">
          {verifyStatus === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Confirm
        </Button>
      </form>
    </div>
  );
}
