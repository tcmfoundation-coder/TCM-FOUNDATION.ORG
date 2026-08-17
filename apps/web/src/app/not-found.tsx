import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-700">404</p>
      <h1 className="font-display text-3xl font-medium text-stone-900">We couldn&apos;t find that page.</h1>
      <p className="text-stone-600">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <Link href="/" className={buttonStyles({ variant: "primary" })}>
        Return Home
      </Link>
    </main>
  );
}
