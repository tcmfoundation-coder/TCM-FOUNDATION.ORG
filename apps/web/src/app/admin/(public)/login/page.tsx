import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthConfig } from "@/lib/api/auth";
import { LoginForm } from "@/components/admin/login-form";
import { redirectIfSignedIn } from "@/lib/redirect-if-signed-in";

// Mirrors the fallback in admin/layout.tsx: if the API is unreachable,
// degrade to hiding the Google button rather than failing the whole page
// (and, at build time, rather than failing the static prerender).
async function getAuthConfigOrDefault() {
  try {
    return await getAuthConfig();
  } catch {
    return { googleEnabled: false };
  }
}

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  // Someone who already has a session does not belong on the sign-in form.
  await redirectIfSignedIn();

  const config = await getAuthConfigOrDefault();
  const { error, sessionExpired } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        <div className="flex flex-col gap-10 p-8 sm:p-12">
          <div className="flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
            <img
              src="/brand/tcm-logo-purple.svg"
              alt="TCM Foundation — The Corporate Muslimah Foundation"
              className="h-9 w-auto"
            />
            <Link href="/" className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to site
            </Link>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-8">
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-3xl font-medium text-stone-900">Admin Sign In</h1>
              <p className="text-sm text-stone-600">Sign in to manage TCM Foundation content.</p>
            </div>
            <LoginForm
              googleEnabled={config.googleEnabled}
              googleError={typeof error === "string" ? error : undefined}
              sessionExpired={typeof sessionExpired === "string"}
            />
          </div>
        </div>

        <div className="relative hidden flex-col justify-end overflow-hidden bg-plum p-12 text-plum-foreground md:flex">
          <Image
            src="/brand/login-mosque.jpg"
            alt="Sheikh Zayed Grand Mosque domes, viewed through an arched doorway"
            fill
            sizes="(min-width: 768px) 50vw, 0px"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-plum/90 via-plum/10 to-plum/30"
            aria-hidden="true"
          />
          <blockquote className="relative z-10 font-display text-2xl leading-snug font-medium">
            &ldquo;Building a future where every Muslim woman can thrive.&rdquo;
          </blockquote>
        </div>
      </div>
    </main>
  );
}
