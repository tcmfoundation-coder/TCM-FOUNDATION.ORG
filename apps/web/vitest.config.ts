import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Node environment only — the tests here cover the consent decision rules and
// the proxy's cookie handling, which are the parts where a mistake silently
// sets a cookie it should not. No jsdom/DOM-testing stack is pulled in for
// that; the banner and withdrawal flows are verified in a real browser
// instead, where the actual Set-Cookie headers can be observed.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
