import rateLimit from "express-rate-limit";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

/** General API traffic — applied to all routes in `app.ts`. */
export const GLOBAL_RATE_LIMIT_MAX = 500;

/** `/api/auth` in production — tighter cap to slow brute-force session attempts. */
export const AUTH_RATE_LIMIT_MAX = 20;

/** `/api/auth` in development/test — matches the previous global cap. */
export const AUTH_RATE_LIMIT_MAX_DEVELOPMENT = GLOBAL_RATE_LIMIT_MAX;

export const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: GLOBAL_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: isProduction ? AUTH_RATE_LIMIT_MAX : AUTH_RATE_LIMIT_MAX_DEVELOPMENT,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: isProduction,
  message: { error: "Too many login attempts, please try again later." },
});
