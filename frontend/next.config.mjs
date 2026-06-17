/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dev/prod proxy to the Express API. API_PROXY_TARGET is server-side only
  // (never NEXT_PUBLIC_*). Defaults to the local backend on :3001.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3001";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;
