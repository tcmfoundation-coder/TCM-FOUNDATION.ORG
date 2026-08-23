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

async function loadClient() {
  vi.resetModules();
  vi.stubGlobal("window", { location: { protocol: "https:" } });
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
  it.each(["/auth/login", "/auth/logout", "/auth/refresh"])(
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
