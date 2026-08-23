import type { NextConfig } from "next";

// The browser must reach the API on the SAME ORIGIN as the site.
//
// Railway registers `up.railway.app` on the Public Suffix List, so
// web-*.up.railway.app and api-*.up.railway.app have different registrable
// domains and count as cross-site. The session cookies are SameSite=Lax, and
// Lax cookies are not sent cross-site — so signing in returned 200, the
// browser discarded the session, and the login form sat spinning.
//
// Rewriting keeps every browser request on the site's own origin, so the
// cookies are first-party. Nothing about the auth or cookie policy changes,
// and this stays correct once a real domain replaces the Railway hostnames.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  rewrites() {
    return [{ source: "/api-proxy/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
  transpilePackages: ["@tcm/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
