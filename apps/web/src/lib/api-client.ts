// Two different bases on purpose.
//
// In the BROWSER, calls go to a same-origin path that next.config.ts rewrites
// to the API. That is what makes the session cookies first-party — see the
// comment there for why cross-origin calls silently lose them on Railway.
//
// On the SERVER, the API is called directly: a server component routing back
// through its own origin would be a pointless extra hop, and there is no
// cookie policy involved in a server-to-server request.
const SERVER_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const BROWSER_API_BASE_URL = "/api-proxy";

const API_BASE_URL =
  typeof window === "undefined" ? SERVER_API_BASE_URL : BROWSER_API_BASE_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; revalidateSeconds?: number };

// NestJS's default HttpException filter returns { statusCode, message, error },
// where `message` is a single string or (from ValidationPipe) an array of
// per-field validation messages. Surface that real message instead of a
// generic "failed with 400" so forms can show the actual problem.
async function extractErrorMessage(response: Response, path: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(" ");
    if (typeof body.message === "string") return body.message;
  } catch {
    // Response body wasn't JSON (or was empty) — fall through.
  }
  return `Request to ${path} failed with ${response.status}`;
}

// Thin fetch wrapper so every call goes through one place for the base URL,
// credentials, and error shape — real endpoints get added domain-by-domain
// as apps/api implements them (Phase 4).
//
// Without an explicit cache policy, Next.js treats a fetch reached during
// static rendering as `force-cache` — permanently cached at build time,
// which would (a) make `next build` fail if the API isn't reachable at
// build time and (b) mean CMS edits never show up without a full rebuild.
// GET requests default to a short revalidate window instead (time-based
// ISR); pass `revalidateSeconds` to override per call.

/**
 * Renews an expired access token using the refresh cookie, then lets the
 * caller retry. Browser only: a Server Component cannot set cookies on the
 * response, so a server-side refresh would obtain new tokens and have nowhere
 * to put them.
 *
 * STRICTLY single-flight, and that is a correctness requirement rather than an
 * optimisation. `TokenService.rotateRefreshToken` implements refresh-token
 * reuse detection: presenting an already-rotated token calls
 * `revokeAllForUser` and kills every session that account has. Two concurrent
 * 401s each firing their own refresh would present the same cookie twice and
 * log the user out of everything. Sharing one in-flight promise makes that
 * impossible.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Cleared on the microtask after every waiter has observed the result,
      // so a later 401 can start a genuinely new refresh.
      queueMicrotask(() => {
        refreshInFlight = null;
      });
    }
  })();
  return refreshInFlight;
}

// Endpoints that must never trigger a refresh-and-retry, and must never
// trigger the terminal-401 redirect below: refresh itself would recurse, and
// a 401 from any of these is itself the real answer (wrong password, wrong
// TOTP code, not-yet-authenticated) rather than a sign that an established
// session died mid-use. mfa/login-verify in particular has no refresh_token
// cookie yet at that stage of login (only mfa_pending_token) — attempting a
// refresh there is always a guaranteed no-op, and without this exclusion a
// mistyped code would incorrectly bounce the user off the MFA screen.
const NO_RETRY_PATHS = ["/auth/refresh", "/auth/login", "/auth/logout", "/auth/mfa/login-verify"];

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, revalidateSeconds, ...rest } = options;
  const method = (rest.method ?? "GET").toString().toUpperCase();

  // FormData (media upload) must be sent as-is so the browser can set its
  // own multipart boundary — JSON.stringify-ing a FormData instance silently
  // produces "{}" and a Content-Type: application/json header would make
  // the backend's multer interceptor never see the file or fields.
  const isFormData = body instanceof FormData;

  const send = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      credentials: "include",
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      ...(method === "GET" ? { next: { revalidate: revalidateSeconds ?? 60 } } : { cache: "no-store" }),
    });

  let response = await send();

  // The access token lives 15 minutes while the refresh token lives 30 days.
  // Until now nothing ever spent that refresh token, so the session simply
  // ended after 15 minutes. One retry only - if the refresh fails, the 401 is
  // genuine and the caller should see it.
  //
  // A FormData body cannot be replayed once consumed, so uploads are not
  // retried; they surface the 401 and the next action refreshes.
  if (
    response.status === 401 &&
    typeof window !== "undefined" &&
    !isFormData &&
    !NO_RETRY_PATHS.some((p) => path.startsWith(p))
  ) {
    if (await refreshSession()) {
      response = await send();
    }

    // Refresh was attempted (this path is never in NO_RETRY_PATHS) and the
    // request is still 401: the session is genuinely over — either refresh
    // itself failed (expired/revoked/reused token, deactivated account), or
    // it "succeeded" but the retried request 401'd anyway (e.g. deactivated
    // in the instant between). Either way the API has already cleared the
    // auth cookies on its response by this point (see AuthService.refresh's
    // catch path), so there's nothing left to clear here — only somewhere to
    // send the admin so the UI stops looking authenticated. Scoped to the
    // admin app specifically: this module also serves the public site's own
    // fetches, which must never be redirected to an admin login screen.
    if (
      response.status === 401 &&
      window.location.pathname.startsWith("/admin") &&
      window.location.pathname !== "/admin/login"
    ) {
      // A full hard navigation is deliberate, not a shortcut: this module is
      // a plain fetch wrapper with no access to useRouter(), and the point
      // is to force the whole authenticated shell (role-gated sidebar, nav)
      // to be torn down and rebuilt from scratch against zero cookies —
      // exactly what a client-side route transition does NOT do.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full reload, see above
      window.location.assign("/admin/login?sessionExpired=1");
    }
  }

  if (!response.ok) {
    throw new ApiError(await extractErrorMessage(response, path), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
