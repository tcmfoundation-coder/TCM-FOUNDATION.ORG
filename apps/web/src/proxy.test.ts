import { describe, expect, it, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { AB_COOKIE_NAME, CONSENT_COOKIE_NAME } from "@/lib/consent";

/**
 * These assert the rule that actually matters: the A/B cookie is optional
 * storage, so it must never appear without a recorded "granted".
 *
 * Assertions read the real `Set-Cookie` header rather than the ResponseCookies
 * helper, because the header is what the browser acts on — flags dropped
 * between the two would not be caught otherwise.
 */
function request(path: string, cookies: Record<string, string> = {}) {
  const header = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new NextRequest(new URL(`http://localhost${path}`), {
    headers: header ? { cookie: header } : {},
  });
}

function setCookieHeader(response: Response) {
  return response.headers.getSetCookie().join("\n");
}

function abDirectives(response: Response): string | null {
  return (
    response.headers.getSetCookie().find((c) => c.startsWith(`${AB_COOKIE_NAME}=`)) ?? null
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("A: first visit, no consent recorded", () => {
  it("does not create the A/B cookie", async () => {
    const res = await proxy(request("/"));
    expect(abDirectives(res)).toBeNull();
  });

  it("does not create any cookie at all", async () => {
    const res = await proxy(request("/"));
    expect(setCookieHeader(res)).toBe("");
  });
});

describe("B: consent declined", () => {
  it("does not create the A/B cookie", async () => {
    const res = await proxy(request("/", { [CONSENT_COOKIE_NAME]: "denied" }));
    expect(abDirectives(res)).toBeNull();
  });

  it("ignores an unrecognised consent value rather than treating it as granted", async () => {
    const res = await proxy(request("/", { [CONSENT_COOKIE_NAME]: "yes-please" }));
    expect(abDirectives(res)).toBeNull();
  });
});

describe("C: consent granted", () => {
  it("creates the A/B cookie on the homepage", async () => {
    const res = await proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted" }));
    expect(abDirectives(res)).toMatch(new RegExp(`^${AB_COOKIE_NAME}=(A|B)`));
  });

  it("assigns only one of the two real variants", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const res = await proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted" }));
      seen.add(abDirectives(res)!.split(";")[0].split("=")[1]);
    }
    expect([...seen].sort()).toEqual(["A", "B"]);
  });

  it("does not reassign when a variant is already held", async () => {
    const res = await proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted", [AB_COOKIE_NAME]: "B" }));
    expect(abDirectives(res)).toBeNull();
  });

  it("does not assign outside the homepage, where the experiment does not run", async () => {
    const res = await proxy(request("/about", { [CONSENT_COOKIE_NAME]: "granted" }));
    expect(abDirectives(res)).toBeNull();
  });
});

describe("F: withdrawal removes the A/B cookie", () => {
  it("deletes it when consent is gone, since httpOnly blocks the browser from doing so", async () => {
    const res = await proxy(request("/", { [AB_COOKIE_NAME]: "A" }));
    const directive = abDirectives(res);
    expect(directive).not.toBeNull();
    expect(directive).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });

  it("deletes it on any page, not just the homepage", async () => {
    const res = await proxy(request("/get-involved", { [AB_COOKIE_NAME]: "A" }));
    expect(abDirectives(res)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });

  it("deletes it after an explicit decline", async () => {
    const res = await proxy(request("/", { [CONSENT_COOKIE_NAME]: "denied", [AB_COOKIE_NAME]: "A" }));
    expect(abDirectives(res)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });
});

describe("I: cookie flags", () => {
  it("is httpOnly, SameSite=Lax, path-scoped and 30 days", async () => {
    const directive = abDirectives(await proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted" })))!;
    expect(directive).toMatch(/HttpOnly/i);
    expect(directive).toMatch(/SameSite=lax/i);
    expect(directive).toMatch(/Path=\//i);
    expect(directive).toMatch(new RegExp(`Max-Age=${30 * 24 * 60 * 60}`));
  });

  it("is not Secure outside production, so it still works over local http", async () => {
    const directive = abDirectives(await proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted" })))!;
    expect(directive).not.toMatch(/Secure/i);
  });

  it("is Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const directive = abDirectives(await proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted" })))!;
    expect(directive).toMatch(/Secure/i);
  });
});

describe("H: authentication cookies are untouched on public/non-admin routes", () => {
  it("never emits a Set-Cookie for an auth cookie, on any consent state", async () => {
    for (const consent of ["granted", "denied", undefined]) {
      const res = await proxy(
        request("/", {
          access_token: "a.b.c",
          refresh_token: "d.e.f",
          mfa_pending_token: "g.h.i",
          ...(consent ? { [CONSENT_COOKIE_NAME]: consent } : {}),
        }),
      );
      const header = setCookieHeader(res);
      expect(header).not.toMatch(/access_token/);
      expect(header).not.toMatch(/refresh_token/);
      expect(header).not.toMatch(/mfa_pending_token/);
    }
  });

  it("does not clear auth cookies during withdrawal", async () => {
    const res = await proxy(request("/", { access_token: "a.b.c", [AB_COOKIE_NAME]: "A" }));
    expect(setCookieHeader(res)).not.toMatch(/access_token/);
  });
});

/**
 * Regression coverage for the session-expiration root cause: a Server
 * Component (serverAuthFetch) has no way to refresh a session — cookies
 * can't be set mid-render — so proxy is the only layer that can transparently
 * renew an admin's session before the (authenticated)/(privileged) layouts
 * ever see the request. Reproduced live before this existed: log in, drop
 * only the access_token cookie (simulating its natural 15-minute expiry),
 * reload /admin/dashboard — landed on /admin/login despite an untouched
 * 30-day refresh_token.
 */
describe("admin session refresh", () => {
  function stubRefresh(impl: (call: { url: string; cookie: string }) => { status: number; setCookies?: string[] }) {
    const calls: { url: string; cookie: string }[] = [];
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      const call = { url, cookie: ((init?.headers as Record<string, string>) ?? {})["cookie"] ?? "" };
      calls.push(call);
      const { status, setCookies = [] } = impl(call);
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        headers: { getSetCookie: () => setCookies },
      } as unknown as Response);
    });
    return calls;
  }

  it("does nothing when the access token is present (healthy session)", async () => {
    const calls = stubRefresh(() => ({ status: 200 }));
    const res = await proxy(request("/admin/dashboard", { access_token: "a", refresh_token: "r" }));
    expect(calls).toHaveLength(0);
    expect(setCookieHeader(res)).toBe("");
  });

  it("does nothing when there is no refresh token either (never logged in)", async () => {
    const calls = stubRefresh(() => ({ status: 200 }));
    const res = await proxy(request("/admin/dashboard"));
    expect(calls).toHaveLength(0);
    expect(setCookieHeader(res)).toBe("");
  });

  it("does nothing on public admin auth-flow pages, even with a stray refresh token", async () => {
    for (const path of ["/admin/login", "/admin/forgot-password", "/admin/reset-password", "/admin/mfa-verify"]) {
      const calls = stubRefresh(() => ({ status: 200 }));
      await proxy(request(path, { refresh_token: "r" }));
      expect(calls).toHaveLength(0);
    }
  });

  it("calls /auth/refresh exactly once when the access token is missing but a refresh token exists", async () => {
    const calls = stubRefresh(() => ({ status: 200, setCookies: ["access_token=new; Path=/; HttpOnly"] }));
    await proxy(request("/admin/dashboard", { refresh_token: "r" }));
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/auth\/refresh$/);
    expect(calls[0].cookie).toContain("refresh_token=r");
  });

  it("relays the fresh cookies to the browser on a successful refresh", async () => {
    stubRefresh(() => ({
      status: 200,
      setCookies: ["access_token=new-access; Path=/; HttpOnly", "refresh_token=new-refresh; Path=/; HttpOnly"],
    }));
    const res = await proxy(request("/admin/dashboard", { refresh_token: "r" }));
    const header = setCookieHeader(res);
    expect(header).toMatch(/access_token=new-access/);
    expect(header).toMatch(/refresh_token=new-refresh/);
  });

  it("relays the clearing Set-Cookie when refresh fails, instead of leaving a dead cookie", async () => {
    stubRefresh(() => ({
      status: 401,
      setCookies: ["access_token=; Path=/; Max-Age=0", "refresh_token=; Path=/; Max-Age=0"],
    }));
    const res = await proxy(request("/admin/dashboard", { refresh_token: "expired-or-revoked" }));
    const header = setCookieHeader(res);
    expect(header).toMatch(/access_token=;.*Max-Age=0/);
    expect(header).toMatch(/refresh_token=;.*Max-Age=0/);
  });

  it("does not throw and sets no cookie when the API is unreachable", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("connect ECONNREFUSED")));
    const res = await proxy(request("/admin/dashboard", { refresh_token: "r" }));
    expect(setCookieHeader(res)).toBe("");
  });
});
