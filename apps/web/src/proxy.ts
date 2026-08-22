import { NextResponse, type NextRequest } from "next/server";
import {
  AB_COOKIE_NAME,
  AB_COOKIE_TTL_SECONDS,
  CONSENT_COOKIE_NAME,
  allowsOptionalStorage,
  parseConsent,
} from "@/lib/consent";

// One real example experiment (design brief section 23: "prepare the design
// system so selected components can eventually support controlled
// experiments... hero CTA wording"), not a fake A/B framework. Assigns a
// stable variant per visitor; Hero reads the cookie server-side, and the
// CTA click is tracked with the variant attached (see
// components/home/hero-cta-link.tsx) so results are analyzable in GA4
// without a second analytics vendor.
//
// Variant assignment is optional experimentation data, so it is gated on the
// visitor's recorded consent: the cookie is created only after an explicit
// "granted", never on a first anonymous visit and never after a decline.
//
// Named `proxy` per this Next.js version's file convention (the
// `middleware.ts`/`export function middleware` convention is deprecated —
// confirmed via node_modules/next/dist/docs, since this postdates training
// data).
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const consent = parseConsent(request.cookies.get(CONSENT_COOKIE_NAME)?.value);

  if (!allowsOptionalStorage(consent)) {
    // Covers withdrawal and any hand-crafted cookie: the A/B cookie is
    // httpOnly, so the browser cannot delete it on withdrawal — this is the
    // only place it can be removed. Deleting from the request too means the
    // Hero rendering this same response no longer sees a stale variant.
    if (request.cookies.has(AB_COOKIE_NAME)) {
      request.cookies.delete(AB_COOKIE_NAME);
      response.cookies.delete({ name: AB_COOKIE_NAME, path: "/" });
    }
    return response;
  }

  // Assignment still only happens on the homepage, where the experiment runs.
  if (request.nextUrl.pathname === "/" && !request.cookies.has(AB_COOKIE_NAME)) {
    const variant = Math.random() < 0.5 ? "A" : "B";
    // Set on the request as well so the Hero rendered by this same response
    // sees the variant it was just assigned, rather than falling back to A
    // for one page view.
    request.cookies.set(AB_COOKIE_NAME, variant);
    response.cookies.set(AB_COOKIE_NAME, variant, {
      maxAge: AB_COOKIE_TTL_SECONDS,
      path: "/",
      sameSite: "lax",
      // The variant reaches the client as a prop from the Hero server
      // component, so no client code ever needs to read this cookie.
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

// Broader than the homepage because removal has to work everywhere: a visitor
// can withdraw consent from the footer on any page, and the A/B cookie must be
// cleared on that request rather than lingering until they happen to visit "/"
// again. Static assets and image optimizer routes are excluded.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
