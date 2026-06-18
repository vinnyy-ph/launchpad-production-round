import request from "supertest";
import { app } from "../../app";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "test-hr-user-id", role: "HR" };
    next();
  }),
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findMany: jest.fn() },
    teamMember: { findMany: jest.fn() },
  },
}));

import { prisma } from "../../core/database/prisma.service";

const employeeFindMany = (prisma as unknown as { employee: { findMany: jest.Mock } }).employee.findMany;
const teamMemberFindMany = (prisma as unknown as { teamMember: { findMany: jest.Mock } }).teamMember.findMany;

const URL = "/api/v1/pulse/surveys/audience/preview";

describe("POST /api/v1/pulse/surveys/audience/preview", () => {
  beforeEach(() => {
    employeeFindMany.mockReset();
    teamMemberFindMany.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );

    await request(app).post(URL).send({ audienceType: "EVERYONE" }).expect(401);
  });

  it("returns 403 when the user is not HR", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (req: any, _res: unknown, next: () => void) => {
        req.user = { id: "emp", role: "EMPLOYEE" };
        next();
      },
    );

    await request(app).post(URL).send({ audienceType: "EVERYONE" }).expect(403);
  });

  it("returns 400 for an invalid audienceType", async () => {
    const res = await request(app).post(URL).send({ audienceType: "DEPARTMENT" }).expect(400);
    expect(res.body).toMatchObject({ success: false, errorCode: "VALIDATION_FAILED" });
  });

  it("resolves EVERYONE to all active employees (count + capped members)", async () => {
    // 1st findMany = activeEmployeeIds; 2nd findMany = member lookup for the response
    employeeFindMany
      .mockResolvedValueOnce([{ id: "e1" }, { id: "e2" }, { id: "e3" }])
      .mockResolvedValueOnce([
        { id: "e1", firstName: "Al", lastName: "Pha" },
        { id: "e2", firstName: "Be", lastName: "Ta" },
        { id: "e3", firstName: "Ga", lastName: "Mma" },
      ]);

    const res = await request(app).post(URL).send({ audienceType: "EVERYONE" }).expect(200);

    expect(res.body.data.count).toBe(3);
    expect(res.body.data.members).toHaveLength(3);
    expect(res.body.data.members[0]).toEqual({ id: "e1", name: "Al Pha" });
    expect(employeeFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { status: "ACTIVE" } }),
    );
  });

  it("resolves SPECIFIC_TEAMS via active team members", async () => {
    teamMemberFindMany.mockResolvedValue([{ employeeId: "e1" }, { employeeId: "e2" }]);
    employeeFindMany.mockResolvedValueOnce([
      { id: "e1", firstName: "Al", lastName: "Pha" },
      { id: "e2", firstName: "Be", lastName: "Ta" },
    ]);

    const res = await request(app)
      .post(URL)
      .send({ audienceType: "SPECIFIC_TEAMS", audienceConfigs: [{ teamId: "team-1" }] })
      .expect(200);

    expect(res.body.data.count).toBe(2);
    expect(teamMemberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: { in: ["team-1"] }, employee: { status: "ACTIVE" } },
      }),
    );
  });

  it("resolves SUPERVISOR_BASED with no supervisors to an empty audience (count 0)", async () => {
    employeeFindMany.mockResolvedValue([]);

    const res = await request(app)
      .post(URL)
      .send({ audienceType: "SUPERVISOR_BASED", audienceConfigs: [] })
      .expect(200);

    expect(res.body.data.count).toBe(0);
    expect(res.body.data.members).toEqual([]);
  });
});
