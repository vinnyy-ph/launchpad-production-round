/** @type {import('next').NextConfig} */

// Same-origin proxy to the Express API so the browser calls /api/* (no CORS) and the
// Next server forwards to the backend. Target is server-side only (not NEXT_PUBLIC).
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3001";

const nextConfig = {
  reactStrictMode: true,
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
};

export default nextConfig;
