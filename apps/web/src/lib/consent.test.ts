import { describe, expect, it } from "vitest";
import { allowsOptionalStorage, parseConsent } from "./consent";

/**
 * The gate is one function used by both the proxy and the banner, so these
 * cover the "fails closed" property directly: anything that is not an explicit
 * grant must read as no.
 */
describe("parseConsent", () => {
  it("recognises the two explicit choices", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
  });

  it("treats absent or unrecognised values as undecided", () => {
    for (const value of [null, undefined, "", "true", "1", "GRANTED", "accepted", "yes"]) {
      expect(parseConsent(value)).toBe("unknown");
    }
  });
});

describe("allowsOptionalStorage", () => {
  it("permits optional storage only after an explicit grant", () => {
    expect(allowsOptionalStorage("granted")).toBe(true);
  });

  it("refuses when undecided or declined", () => {
    expect(allowsOptionalStorage("unknown")).toBe(false);
    expect(allowsOptionalStorage("denied")).toBe(false);
  });

  it("refuses every value that is not an explicit grant", () => {
    for (const value of [null, undefined, "", "true", "GRANTED", "yes"]) {
      expect(allowsOptionalStorage(parseConsent(value))).toBe(false);
    }
  });
});
