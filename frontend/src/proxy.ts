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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const wsUrl = apiUrl?.replace(/^http/, "ws"); // http->ws, https->wss
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    !isProd && "'unsafe-eval'", // next dev fast-refresh evaluates code via eval
  ].filter(Boolean);

  const connectSrc = [
    "'self'",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://www.googleapis.com",
    apiUrl,
    wsUrl,
  ].filter(Boolean);

  const frameSrc = [
    "'self'",
    "https://accounts.google.com",
    "https://*.firebaseapp.com",
    authDomain && `https://${authDomain}`,
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
