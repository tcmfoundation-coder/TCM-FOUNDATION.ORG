import { NextResponse, type NextRequest } from "next/server";

const AB_COOKIE_NAME = "ab-hero-cta";
const AB_COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days — stable per-visitor variant

// One real example experiment (design brief section 23: "prepare the design
// system so selected components can eventually support controlled
// experiments... hero CTA wording"), not a fake A/B framework. Assigns a
// stable variant per visitor; Hero reads the cookie server-side, and the
// CTA click is tracked with the variant attached (see
// components/home/hero-cta-link.tsx) so results are analyzable in GA4
// without a second analytics vendor.
//
// Named `proxy` per this Next.js version's file convention (the
// `middleware.ts`/`export function middleware` convention is deprecated —
// confirmed via node_modules/next/dist/docs, since this postdates training
// data).
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.has(AB_COOKIE_NAME)) {
    const variant = Math.random() < 0.5 ? "A" : "B";
    response.cookies.set(AB_COOKIE_NAME, variant, {
      maxAge: AB_COOKIE_TTL_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: "/",
};
