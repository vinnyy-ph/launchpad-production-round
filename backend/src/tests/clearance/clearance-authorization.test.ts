import type { User } from "@prisma/client";
import request from "supertest";
import { app } from "../../app";
import {
  buildSignatoryUser,
  SIGNATORY_EMPLOYEE_ID,
} from "./clearance-test.helpers";

let mockCurrentUser: User | undefined;

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (
    req: { user?: unknown },
    res: { status: (n: number) => { json: (b: unknown) => unknown } },
    next: () => void,
  ) => {
    if (!mockCurrentUser) {
      return res.status(401).json({ error: "Missing bearer token" });
    }
    req.user = mockCurrentUser;
    return next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn() },
    clearanceSignatureRequest: { findMany: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("../../core/database/prisma.service");

describe("clearance - authorization", () => {
  beforeEach(() => {
    mockCurrentUser = undefined;
    prisma.employee.findUnique.mockReset();
    prisma.clearanceSignatureRequest.findMany.mockReset();
  });

  it("returns 401 for an unauthenticated assigned-clearance request", async () => {
    await request(app).get("/api/v1/clearance/assigned").expect(401);
  });

  it("returns the caller's own assigned signature requests", async () => {
    mockCurrentUser = buildSignatoryUser() as User;
    prisma.employee.findUnique.mockResolvedValue({ id: SIGNATORY_EMPLOYEE_ID });
    prisma.clearanceSignatureRequest.findMany.mockResolvedValue([]);

    await request(app).get("/api/v1/clearance/assigned").expect(200);

    expect(prisma.clearanceSignatureRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { signatoryId: SIGNATORY_EMPLOYEE_ID } }),
    );
  });
});
