import { NextResponse } from "next/server";

// Sets a request-independent Content-Security-Policy on every document response.
//
// script-src uses 'self' + 'unsafe-inline' (no nonce / 'strict-dynamic'): a per-request
// nonce can't work here because Next prerenders and full-route-caches the client-SPA pages,
// baking a build-time nonce into the HTML that never matches a per-request header nonce.
// 'self' covers the same-origin /_next/static chunks; 'unsafe-inline' covers Next's inline
// hydration bootstrap. style-src keeps 'unsafe-inline' for Recharts/shadcn inline <style>.
//
// connect-src / frame-src allowlist Firebase Auth (Google popup sign-in) and the Express
// API origin (HTTPS + WSS for the notifications socket) so login and realtime keep working.
export function proxy() {
  const isProd = process.env.NODE_ENV === "production";

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "https://apis.google.com", // Firebase Google sign-in injects the gapi loader (apis.google.com/js/api.js)
    "https://www.gstatic.com", // Firebase auth helper scripts
    !isProd && "'unsafe-eval'", // next dev fast-refresh evaluates code via eval
  ].filter(Boolean);

  const connectSrc = [
    "'self'",
    // Host-level allowlisting proved fragile across Firebase/Google auth, Cloudinary,
    // the API and the notifications socket — and with script-src already allowing
    // 'unsafe-inline', a strict connect-src adds little real protection. Allow any HTTPS
    // /WSS origin (mirrors img-src 'https:'); still blocks http: downgrade + data:/blob: exfil.
    "https:",
    "wss:",
    // dev talks to the local API + socket over http/ws (NEXT_PUBLIC_API_URL is often unset locally).
    !isProd && "http://localhost:*",
    !isProd && "ws://localhost:*",
    !isProd && "http://127.0.0.1:*",
    !isProd && "ws://127.0.0.1:*",
  ].filter(Boolean);

  const frameSrc = [
    "'self'",
    "blob:", // Firebase popup sign-in renders its helper in a blob: iframe
    // Cloudinary upload/media widget + Google/Firebase auth all frame third-party https
    // origins; enumerating them proved fragile. frame-ancestors 'none' still blocks US
    // from being framed (the clickjacking protection that matters).
    "https:",
  ].filter(Boolean);

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    `frame-src ${frameSrc.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isProd && "upgrade-insecure-requests", // would break http subresources in dev
  ]
    .filter(Boolean)
    .join("; ");

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Documents only — skip API routes and static assets.
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "x-action" },
      ],
    },
  ],
};
