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
    team: { findMany: jest.fn() },
  },
}));

import { prisma } from "../../core/database/prisma.service";

const employeeFindMany = (prisma as unknown as { employee: { findMany: jest.Mock } }).employee.findMany;
const teamFindMany = (prisma as unknown as { team: { findMany: jest.Mock } }).team.findMany;

const URL = "/api/v1/pulse/surveys/audience/options";

describe("GET /api/v1/pulse/surveys/audience/options", () => {
  beforeEach(() => {
    employeeFindMany.mockReset();
    teamFindMany.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );

    await request(app).get(URL).expect(401);
  });

  it("returns 403 when the user is not HR", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (req: any, _res: unknown, next: () => void) => {
        req.user = { id: "test-employee-user-id", role: "EMPLOYEE" };
        next();
      },
    );

    await request(app).get(URL).expect(403);
  });

  it("returns supervisors (name + jobTitle) and teams", async () => {
    employeeFindMany.mockResolvedValue([
      { id: "sup-1", firstName: "Ada", lastName: "Lovelace", jobTitle: "Eng Lead" },
      { id: "sup-2", firstName: "Grace", lastName: "Hopper", jobTitle: null },
    ]);
    teamFindMany.mockResolvedValue([
      { id: "team-1", name: "Nursing" },
      { id: "team-2", name: "Pharmacy" },
    ]);

    const res = await request(app).get(URL).expect(200);

    expect(res.body).toMatchObject({ success: true });
    expect(res.body.data.supervisors).toEqual([
      { id: "sup-1", name: "Ada Lovelace", jobTitle: "Eng Lead" },
      { id: "sup-2", name: "Grace Hopper", jobTitle: null },
    ]);
    expect(res.body.data.teams).toEqual([
      { id: "team-1", name: "Nursing" },
      { id: "team-2", name: "Pharmacy" },
    ]);
  });

  it("only queries ACTIVE employees that have at least one direct report", async () => {
    employeeFindMany.mockResolvedValue([]);
    teamFindMany.mockResolvedValue([]);

    await request(app).get(URL).expect(200);

    expect(employeeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE", directReports: { some: {} } },
      }),
    );
  });
});
