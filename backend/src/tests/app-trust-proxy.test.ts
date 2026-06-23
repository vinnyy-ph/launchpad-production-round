process.env.NODE_ENV = "production";

jest.mock("../core/middleware/auth.middleware", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock("../core/database/prisma.service", () => ({
  prisma: {},
}));

import { app } from "../app";

describe("app trust proxy (production)", () => {
  it("trusts the first proxy hop so rate limits see the client IP", () => {
    expect(app.get("trust proxy")).toBe(1);
  });
});
