process.env.NODE_ENV = "production";

jest.mock("../core/middleware/auth.middleware", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock("../core/database/prisma.service", () => ({
  prisma: {},
}));

import request from "supertest";
import { app } from "../app";

describe("GET /docs (production)", () => {
  it("returns 404 and does not expose Swagger UI", async () => {
    const res = await request(app).get("/docs/");
    expect(res.status).toBe(404);
  });
});
