import type { User } from "@prisma/client";
import request from "supertest";
import { app } from "../../app";
import { buildSupervisorUser } from "./offboarding-test.helpers";

// A mutable caller injected by the auth mock; unset => unauthenticated (401).
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
    employee: { findUnique: jest.fn(), findMany: jest.fn() },
    offboardingRecord: { findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const FORBIDDEN_BODY = {
  success: false,
  message: "You do not have permission to perform this action",
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("../../core/database/prisma.service");

describe("offboarding - authorization", () => {
  beforeEach(() => {
    mockCurrentUser = undefined;
    prisma.employee.findUnique.mockReset();
    prisma.employee.findMany.mockReset();
    prisma.offboardingRecord.findMany.mockReset();
  });

  it("returns 401 for an unauthenticated list request", async () => {
    await request(app).get("/api/v1/offboarding").expect(401);
  });

  it("returns 403 when a non-HR/ADMIN tries to initiate offboarding", async () => {
    mockCurrentUser = buildSupervisorUser() as User;

    const response = await request(app)
      .post("/api/v1/offboarding")
      .send({ employeeId: "e1", tenderDate: "2026-06-01", effectiveDate: "2026-06-30" })
      .expect(403);

    expect(response.body).toEqual(FORBIDDEN_BODY);
  });

  it("returns 403 when a non-HR/ADMIN tries to reassign reports", async () => {
    mockCurrentUser = buildSupervisorUser() as User;

    const response = await request(app)
      .post("/api/v1/offboarding/some-id/reassign")
      .send({ newSupervisorId: "x" })
      .expect(403);

    expect(response.body).toEqual(FORBIDDEN_BODY);
  });

  it("scopes the list to the supervisor's downward chain for a non-HR/ADMIN caller", async () => {
    mockCurrentUser = buildSupervisorUser() as User;
    prisma.employee.findUnique.mockResolvedValue({ id: "supervisor-employee-id" });
    // downwardChain: first frontier returns one report, then no more.
    prisma.employee.findMany
      .mockResolvedValueOnce([{ id: "report-1" }])
      .mockResolvedValueOnce([]);
    prisma.offboardingRecord.findMany.mockResolvedValue([]);

    await request(app).get("/api/v1/offboarding").expect(200);

    expect(prisma.offboardingRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { employeeId: { in: ["report-1"] } },
      }),
    );
  });
});
