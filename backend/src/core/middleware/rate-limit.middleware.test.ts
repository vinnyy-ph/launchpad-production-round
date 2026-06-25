import {
  AUTH_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_MAX_DEVELOPMENT,
  GLOBAL_RATE_LIMIT_MAX,
} from "./rate-limit.middleware";

describe("rate-limit.middleware", () => {
  it("uses a stricter production auth cap than the global limiter", () => {
    expect(AUTH_RATE_LIMIT_MAX).toBeLessThan(GLOBAL_RATE_LIMIT_MAX);
  });

  it("keeps the development auth cap aligned with the global limiter", () => {
    expect(AUTH_RATE_LIMIT_MAX_DEVELOPMENT).toBe(GLOBAL_RATE_LIMIT_MAX);
  });
});
