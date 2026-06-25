import { NextResponse, type NextRequest } from "next/server";

// Builds a per-request, nonce-based Content-Security-Policy.
//
// script-src uses 'nonce-<value>' + 'strict-dynamic' (no 'unsafe-inline'): Next.js reads
// the nonce from the CSP request header and stamps it onto its own scripts, so hydration
// works without weakening the policy. style-src keeps 'unsafe-inline' on purpose — shadcn
// chart (chart.tsx) and Recharts inject inline <style> tags that can't carry a nonce
// without invasive plumbing; this matches the backend helmet config (accepted low risk).
//
// connect-src / frame-src allowlist Firebase Auth (Google popup sign-in) and the Express
// API origin (HTTPS + WSS for the notifications socket) so login and realtime keep working.
export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const isProd = process.env.NODE_ENV === "production";

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const wsUrl = apiUrl?.replace(/^http/, "ws"); // http->ws, https->wss
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
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

  // Next.js reads the nonce from the CSP on the *request* headers; the *response* header is
  // what the browser enforces.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Documents only — skip API routes and static assets (they don't need a nonce CSP).
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "x-action" },
      ],
    },
  ],
};
