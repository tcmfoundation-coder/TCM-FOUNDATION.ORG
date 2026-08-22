import { notFound } from "next/navigation";

// Next.js only renders a nested not-found.tsx when notFound() is called
// from within a route that actually matched — an arbitrary unmatched path
// like /admin/some-typo falls through to the app-root not-found.tsx instead
// (a documented Next.js limitation, not a bug in admin/not-found.tsx
// itself). This catch-all matches every otherwise-unmatched /admin/* path
// and explicitly triggers notFound(), so the nearest not-found.tsx —
// admin/not-found.tsx — is the one that renders.
export default function AdminCatchAll() {
  notFound();
}
