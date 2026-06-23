/** @type {import('next').NextConfig} */

// Same-origin proxy to the Express API so the browser calls /api/* (no CORS) and the
// Next server forwards to the backend. Target is server-side only (not NEXT_PUBLIC).
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3001";

const nextConfig = {
  reactStrictMode: true,
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
    // Baseline hardening. A full script-src CSP is intentionally omitted: Next's
    // hydration relies on inline scripts, which would need a nonce-based CSP (middleware).
    // These directives add clickjacking / base-tag / plugin protection without that work.
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
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
