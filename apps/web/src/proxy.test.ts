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
});

describe("A: first visit, no consent recorded", () => {
  it("does not create the A/B cookie", () => {
    const res = proxy(request("/"));
    expect(abDirectives(res)).toBeNull();
  });

  it("does not create any cookie at all", () => {
    const res = proxy(request("/"));
    expect(setCookieHeader(res)).toBe("");
  });
});

describe("B: consent declined", () => {
  it("does not create the A/B cookie", () => {
    const res = proxy(request("/", { [CONSENT_COOKIE_NAME]: "denied" }));
    expect(abDirectives(res)).toBeNull();
  });

  it("ignores an unrecognised consent value rather than treating it as granted", () => {
    const res = proxy(request("/", { [CONSENT_COOKIE_NAME]: "yes-please" }));
    expect(abDirectives(res)).toBeNull();
  });
});

describe("C: consent granted", () => {
  it("creates the A/B cookie on the homepage", () => {
    const res = proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted" }));
    expect(abDirectives(res)).toMatch(new RegExp(`^${AB_COOKIE_NAME}=(A|B)`));
  });

  it("assigns only one of the two real variants", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const res = proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted" }));
      seen.add(abDirectives(res)!.split(";")[0].split("=")[1]);
    }
    expect([...seen].sort()).toEqual(["A", "B"]);
  });

  it("does not reassign when a variant is already held", () => {
    const res = proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted", [AB_COOKIE_NAME]: "B" }));
    expect(abDirectives(res)).toBeNull();
  });

  it("does not assign outside the homepage, where the experiment does not run", () => {
    const res = proxy(request("/about", { [CONSENT_COOKIE_NAME]: "granted" }));
    expect(abDirectives(res)).toBeNull();
  });
});

describe("F: withdrawal removes the A/B cookie", () => {
  it("deletes it when consent is gone, since httpOnly blocks the browser from doing so", () => {
    const res = proxy(request("/", { [AB_COOKIE_NAME]: "A" }));
    const directive = abDirectives(res);
    expect(directive).not.toBeNull();
    expect(directive).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });

  it("deletes it on any page, not just the homepage", () => {
    const res = proxy(request("/get-involved", { [AB_COOKIE_NAME]: "A" }));
    expect(abDirectives(res)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });

  it("deletes it after an explicit decline", () => {
    const res = proxy(request("/", { [CONSENT_COOKIE_NAME]: "denied", [AB_COOKIE_NAME]: "A" }));
    expect(abDirectives(res)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });
});

describe("I: cookie flags", () => {
  it("is httpOnly, SameSite=Lax, path-scoped and 30 days", () => {
    const directive = abDirectives(proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted" })))!;
    expect(directive).toMatch(/HttpOnly/i);
    expect(directive).toMatch(/SameSite=lax/i);
    expect(directive).toMatch(/Path=\//i);
    expect(directive).toMatch(new RegExp(`Max-Age=${30 * 24 * 60 * 60}`));
  });

  it("is not Secure outside production, so it still works over local http", () => {
    const directive = abDirectives(proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted" })))!;
    expect(directive).not.toMatch(/Secure/i);
  });

  it("is Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const directive = abDirectives(proxy(request("/", { [CONSENT_COOKIE_NAME]: "granted" })))!;
    expect(directive).toMatch(/Secure/i);
  });
});

describe("H: authentication cookies are untouched", () => {
  it("never emits a Set-Cookie for an auth cookie, on any consent state", () => {
    for (const consent of ["granted", "denied", undefined]) {
      const res = proxy(
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

  it("does not clear auth cookies during withdrawal", () => {
    const res = proxy(request("/", { access_token: "a.b.c", [AB_COOKIE_NAME]: "A" }));
    expect(setCookieHeader(res)).not.toMatch(/access_token/);
  });
});
