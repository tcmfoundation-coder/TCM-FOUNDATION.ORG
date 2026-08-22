import "server-only";
import { redirect } from "next/navigation";
import { serverAuthFetch } from "./server-auth-fetch";

/**
 * Guards the entry points into the auth flow (login, mfa-verify) against
 * being rendered to someone who already has a session.
 *
 * This is what makes the post-authentication transition work without a full
 * page reload. `admin/layout.tsx` is a server layout shared by every /admin
 * route, and per Next.js Partial Rendering a shared layout is NOT re-rendered
 * on client-side navigation — so after signing in, `router.push()` alone would
 * land on the dashboard still wearing the logged-out chrome.
 *
 * `router.refresh()` re-renders *the current route* (the framework's words),
 * which is still the login/mfa-verify route at that moment. Because these
 * pages now redirect once a session exists, that single refresh both
 * re-renders the shared layout with the new session AND moves the user to the
 * dashboard — one server round trip, no ordering race between push and
 * refresh, and no `window.location.reload()`.
 *
 * It also means a manual browser refresh, or navigating back to /admin/login
 * while signed in, can never leave a stale auth form on screen.
 *
 * Security note: this only redirects *away* from public auth pages. It grants
 * nothing. The real boundaries are unchanged — (authenticated)/layout.tsx,
 * (privileged)/layout.tsx, and RolesGuard on every API call.
 */
export async function redirectIfSignedIn(destination = "/admin/dashboard") {
  let response: Response;
  try {
    response = await serverAuthFetch("/roles/me");
  } catch {
    // API unreachable — fall through and render the auth page rather than
    // trapping someone who cannot sign in. Same degradation as
    // admin/layout.tsx and the login page's own config fetch.
    return;
  }

  // Deliberately outside the try/catch: redirect() signals by throwing, and
  // catching it here would silently cancel the navigation.
  if (response.ok) {
    redirect(destination);
  }
}
