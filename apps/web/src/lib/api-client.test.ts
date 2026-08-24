import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These cover the session-refresh behaviour, and the single-flight property in
 * particular.
 *
 * That property is a correctness requirement, not a performance nicety. The
 * API's `rotateRefreshToken` implements refresh-token reuse detection: present
 * an already-rotated token and it calls `revokeAllForUser`, ending every
 * session that account has. If two simultaneous 401s each fired their own
 * refresh, the second would present the same cookie and log the user out
 * everywhere. A regression here would be worse than the bug this fixes.
 *
 * `api-client` decides its base URL from `typeof window` at module scope, so
 * each test stubs `window` first and imports the module fresh.
 */
type FetchCall = { url: string; method: string };

let calls: FetchCall[] = [];
let responder: (call: FetchCall, n: number) => { status: number; body?: unknown };

// Defaults to a neutral, non-admin path so existing tests (which don't care
// about the terminal-401 redirect) aren't affected by it regardless of
// refresh outcome. Tests that DO care pass their own pathname.
async function loadClient(pathname = "/") {
  vi.resetModules();
  vi.stubGlobal("window", { location: { protocol: "https:", pathname, assign: vi.fn() } });
  vi.stubGlobal("fetch", (input: string, init?: RequestInit) => {
    const call = { url: String(input), method: (init?.method ?? "GET").toUpperCase() };
    calls.push(call);
    const { status, body } = responder(call, calls.length);
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body ?? {}),
      text: () => Promise.resolve(JSON.stringify(body ?? {})),
      headers: { get: () => "application/json" },
    } as unknown as Response);
  });
  return import("./api-client");
}

const isRefresh = (c: FetchCall) => c.url.includes("/auth/refresh");

beforeEach(() => {
  calls = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refresh on 401", () => {
  it("refreshes once, then retries the original request", async () => {
    responder = (call, n) => {
      if (isRefresh(call)) return { status: 200 };
      return n === 1 ? { status: 401 } : { status: 200, body: { ok: true } };
    };
    const { apiClient } = await loadClient();
    await expect(apiClient.get("/roles/me")).resolves.toEqual({ ok: true });

    expect(calls.map((c) => (isRefresh(c) ? "refresh" : "request"))).toEqual([
      "request",
      "refresh",
      "request",
    ]);
  });

  it("surfaces the 401 when the refresh itself fails", async () => {
    responder = (call) => ({ status: isRefresh(call) ? 401 : 401 });
    const { apiClient, ApiError } = await loadClient();
    await expect(apiClient.get("/roles/me")).rejects.toBeInstanceOf(ApiError);
    // One attempt, one refresh, and no pointless second attempt.
    expect(calls.filter(isRefresh)).toHaveLength(1);
    expect(calls.filter((c) => !isRefresh(c))).toHaveLength(1);
  });

  it("retries at most once, so a still-401 response is not looped", async () => {
    responder = (call) => ({ status: isRefresh(call) ? 200 : 401 });
    const { apiClient } = await loadClient();
    await expect(apiClient.get("/roles/me")).rejects.toThrow();
    expect(calls.filter(isRefresh)).toHaveLength(1);
    expect(calls.filter((c) => !isRefresh(c))).toHaveLength(2);
  });
});

describe("single-flight (guards against reuse detection revoking all sessions)", () => {
  it("issues exactly ONE refresh for many simultaneous 401s", async () => {
    const seen = new Set<string>();
    responder = (call) => {
      if (isRefresh(call)) return { status: 200 };
      // Each distinct path 401s the first time it is asked.
      if (!seen.has(call.url)) {
        seen.add(call.url);
        return { status: 401 };
      }
      return { status: 200, body: { ok: true } };
    };
    const { apiClient } = await loadClient();

    await Promise.all([
      apiClient.get("/roles/me"),
      apiClient.get("/programs"),
      apiClient.get("/media"),
      apiClient.get("/audit-logs"),
    ]);

    expect(calls.filter(isRefresh)).toHaveLength(1);
  });
});

describe("paths that must never trigger a refresh", () => {
  it.each(["/auth/login", "/auth/logout", "/auth/refresh", "/auth/mfa/login-verify"])(
    "does not refresh-and-retry a 401 from %s",
    async (path) => {
      responder = () => ({ status: 401 });
      const { apiClient } = await loadClient();
      await expect(apiClient.post(path, {})).rejects.toThrow();
      expect(calls.filter(isRefresh)).toHaveLength(path === "/auth/refresh" ? 1 : 0);
      expect(calls).toHaveLength(1);
    },
  );
});

/**
 * Regression coverage for the other half of the session-expiration bug: once
 * a refresh has been attempted and the session is confirmed dead (refresh
 * token expired/revoked/reused, or the account was deactivated), the admin
 * app must not strand the user on a page that still looks authenticated —
 * see the various admin list components that previously just set a generic
 * "Failed to load X" error and stopped. The API has already cleared the
 * cookies by this point (AuthService.refresh's catch path); the client's only
 * remaining job is to leave the dead page.
 */
describe("terminal session death redirects to login", () => {
  it("redirects when a 401 survives refresh-and-retry on an admin page", async () => {
    responder = () => ({ status: 401 });
    const { apiClient } = await loadClient("/admin/content/programs");
    await expect(apiClient.get("/programs/admin")).rejects.toThrow();
    expect(window.location.assign).toHaveBeenCalledWith("/admin/login?sessionExpired=1");
  });

  it("does not redirect a page outside /admin (this client also serves the public site)", async () => {
    responder = () => ({ status: 401 });
    const { apiClient } = await loadClient("/programs");
    await expect(apiClient.get("/some-authed-endpoint")).rejects.toThrow();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("does not redirect-loop when already on the login page", async () => {
    responder = () => ({ status: 401 });
    const { apiClient } = await loadClient("/admin/login");
    await expect(apiClient.post("/some-authed-endpoint", {})).rejects.toThrow();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("does not redirect a wrong MFA code away from the MFA screen", async () => {
    responder = () => ({ status: 401 });
    const { apiClient } = await loadClient("/admin/mfa-verify");
    await expect(apiClient.post("/auth/mfa/login-verify", { code: "000000" })).rejects.toThrow();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("does not redirect when the retried request succeeds", async () => {
    responder = (call, n) => {
      if (isRefresh(call)) return { status: 200 };
      return n === 1 ? { status: 401 } : { status: 200, body: { ok: true } };
    };
    const { apiClient } = await loadClient("/admin/dashboard");
    await expect(apiClient.get("/roles/me")).resolves.toEqual({ ok: true });
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
