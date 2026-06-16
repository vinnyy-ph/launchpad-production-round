/**
 * Shared API route prefixes.
 * Controllers and app wiring should use these constants so version changes stay centralized.
 */
export const API_ROUTES = {
  ROOT: "/api",
  VERSION: "v1",
  VERSIONED_ROOT: "/api/v1",
} as const;

export type ApiRoute = (typeof API_ROUTES)[keyof typeof API_ROUTES];
