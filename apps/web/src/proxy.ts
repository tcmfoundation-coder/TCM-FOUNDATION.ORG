import { NextResponse, type NextRequest } from "next/server";
import {
  AB_COOKIE_NAME,
  AB_COOKIE_TTL_SECONDS,
  CONSENT_COOKIE_NAME,
  allowsOptionalStorage,
  parseConsent,
} from "@/lib/consent";

const ACCESS_COOKIE_NAME = "access_token";
const REFRESH_COOKIE_NAME = "refresh_token";
const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Admin routes reachable with no session at all — a visitor here IS the auth
// flow (or completing it), not a lapsed mid-session request, so this proxy
// must never attempt a refresh (or let a stale cookie confuse the flow).
const ADMIN_PUBLIC_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password", "/admin/mfa-verify"];

// Applies a batch of raw Set-Cookie strings (as returned verbatim by the API)
// on top of an existing Cookie request header, so the Server Component render
// that follows in THIS SAME request sees the freshly-rotated access token
// instead of the one that just expired. Only the "name=value" — never the
// attributes (HttpOnly/Secure/...), which belong on a response, not a
// request — is taken from each Set-Cookie string.
function mergeCookieHeader(existing: string | null, setCookieHeaders: string[]): string {
  const jar = new Map<string, string>();
  for (const pair of (existing ?? "").split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    if (name) jar.set(name, pair.slice(eq + 1).trim());
  }
  for (const setCookie of setCookieHeaders) {
    const firstPair = setCookie.split(";")[0] ?? "";
    const eq = firstPair.indexOf("=");
    if (eq === -1) continue;
    const name = firstPair.slice(0, eq).trim();
    if (name) jar.set(name, firstPair.slice(eq + 1).trim());
  }
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

/**
 * Optimistic, proxy-level session refresh for admin page navigations.
 *
 * The access token lives 15 minutes; the refresh token lives 30 days. Before
 * this existed, ANY admin page load/navigation after that 15-minute mark
 * (hard refresh, a new tab, or the router cache simply going stale — see the
 * Next.js authentication guide's "Layouts and auth checks" note on why a
 * layout-level check alone is not enough) forwarded the now-cookieless
 * request straight to the (authenticated)/(privileged) layouts'
 * `serverAuthFetch`, which has no way to refresh — a Server Component cannot
 * set response cookies — so it always saw a 401 and redirected to
 * /admin/login, discarding a still-valid 30-day session. Reproduced live:
 * login, drop just the access_token cookie, reload /admin/dashboard — lands
 * back on /admin/login even though refresh_token is untouched.
 *
 * Proxy is the one layer that runs before that render AND can both call the
 * API and attach cookies to the response, so this is where the transparent
 * refresh ("if access token expires but refresh token is valid, transparently
 * refresh once") has to live for the server-rendered path. The browser-side
 * equivalent already exists and is unaffected (api-client.ts's single-flight
 * refreshSession).
 *
 * Deliberately does nothing when refresh_token is ALSO absent (never-logged-in
 * visitor) or when it fails (expired/revoked/deactivated) beyond relaying the
 * clearing Set-Cookie the API sends in that case — the existing layout-level
 * check already redirects to /admin/login correctly for both, and duplicating
 * that redirect here would be a second source of truth for the same decision.
 */
async function refreshAdminSession(
  request: NextRequest,
): Promise<{ setCookies: string[]; ok: boolean }> {
  try {
    const apiRes = await fetch(`${API_ORIGIN}/auth/refresh`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    return { setCookies: apiRes.headers.getSetCookie(), ok: apiRes.ok };
  } catch {
    // API unreachable — fall through with the original request untouched;
    // the layout's own check redirects to login exactly as it does today.
    return { setCookies: [], ok: false };
  }
}

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
export async function proxy(request: NextRequest) {
  let response = NextResponse.next();

  // Mutually exclusive with the "/" A/B-assignment branch below (no path is
  // both "/" and "/admin/*"), so replacing `response` here never discards an
  // A/B cookie mutation from the same request.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && !ADMIN_PUBLIC_PATHS.includes(pathname)) {
    const hasAccess = request.cookies.has(ACCESS_COOKIE_NAME);
    const hasRefresh = request.cookies.has(REFRESH_COOKIE_NAME);

    if (!hasAccess && hasRefresh) {
      const { setCookies, ok } = await refreshAdminSession(request);
      if (setCookies.length > 0) {
        if (ok) {
          const requestHeaders = new Headers(request.headers);
          requestHeaders.set("cookie", mergeCookieHeader(requestHeaders.get("cookie"), setCookies));
          response = NextResponse.next({ request: { headers: requestHeaders } });
        }
        // Relayed in both branches: on success these are the fresh
        // access/refresh cookies; on failure (expired/revoked/deactivated)
        // they're the API's own clearing Set-Cookie, so a dead refresh_token
        // doesn't linger in the browser until its 30-day maxAge elapses.
        for (const setCookie of setCookies) {
          response.headers.append("set-cookie", setCookie);
        }
      }
    }
  }

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
