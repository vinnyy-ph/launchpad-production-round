import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** @type {import('next').NextConfig} */

// Same-origin proxy to the Express API so the browser calls /api/* (no CORS) and the
// Next server forwards to the backend. Target is server-side only (not NEXT_PUBLIC).
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3001";

const nextConfig = {
  // Bulk onboarding commit can run for minutes (DB + invitation email per row).
  // Dev rewrites proxy through Next; default proxy timeout is 30s and causes ECONNRESET.
  experimental: {
    proxyTimeout: 5 * 60 * 1000,
  },
  reactStrictMode: true,
  // Dependencies are hoisted to the monorepo root node_modules (npm workspaces), so pin
  // Turbopack's root there to silence the multi-lockfile inference warning and keep
  // package resolution working.
  turbopack: { root: join(dirname(fileURLToPath(import.meta.url)), "..") },
  // Don't advertise the framework (ZAP: X-Powered-By information leak).
  poweredByHeader: false,
  transpilePackages: ["react-phone-number-input", "libphonenumber-js"],
  async redirects() {
    return [
      {
        source: "/hr/onboarding",
        destination: "/hr/directory?tab=onboarding",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_PROXY_TARGET}/api/:path*` },
    ];
  },
  async headers() {
    // Baseline hardening. The Content-Security-Policy is set in middleware.ts so it can
    // carry a per-request nonce for script-src (strict-dynamic). The headers below are
    // request-independent, so they stay here.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Effective only over HTTPS; harmless over http (dev). 2 years + preload.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
