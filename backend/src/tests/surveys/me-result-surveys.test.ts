// backend/src/tests/surveys/me-result-surveys.test.ts
import request from "supertest";
import { app } from "../../app";
import { prisma } from "../../core/database/prisma.service";
import { createOrgChains } from "../../modules/shared/org/chains";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "u-hr", role: "HR" };
    next();
  }),
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn() },
    pulseSurvey: { findMany: jest.fn() },
    surveyAudienceMember: { findMany: jest.fn() },
  },
}));

jest.mock("../../modules/shared/org/chains", () => ({
  createOrgChains: jest.fn(() => ({ downwardChain: jest.fn().mockResolvedValue([]) })),
}));

const URL = "/api/v1/pulse/me/result-surveys";

describe("GET /api/v1/pulse/me/result-surveys", () => {
  const employeeFind = prisma.employee.findUnique as jest.Mock;
  const surveyFindMany = prisma.pulseSurvey.findMany as jest.Mock;
  const audienceFindMany = prisma.surveyAudienceMember.findMany as jest.Mock;
  const mockChains = createOrgChains as jest.Mock;
  const authMock = jest.requireMock("../../core/middleware/auth.middleware");

  const setAuth = (user: { id: string; role: string }) =>
    authMock.authenticate.mockImplementation((req: any, _res: any, next: any) => {
      req.user = user;
      next();
    });

  const surveys = [
    { id: "s-every", name: "All hands", isAnonymous: true, isActive: true, visibility: "EVERYONE", audienceConfigs: [], visibilityConfigs: [], _count: { occurrences: 1 } },
    { id: "s-sup", name: "Team pulse", isAnonymous: false, isActive: false, visibility: "SUPERVISOR_BASED", audienceConfigs: [], visibilityConfigs: [], _count: { occurrences: 2 } },
    { id: "s-team", name: "Nursing", isAnonymous: true, isActive: true, visibility: "TEAM_BASED", audienceConfigs: [{ teamId: "t1" }], visibilityConfigs: [], _count: { occurrences: 1 } },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    setAuth({ id: "u-hr", role: "HR" });
    surveyFindMany.mockResolvedValue(surveys);
    audienceFindMany.mockResolvedValue([]);
    mockChains.mockReturnValue({ downwardChain: jest.fn().mockResolvedValue([]) });
  });

  it("HR sees every activated survey", async () => {
    const res = await request(app).get(URL).expect(200);
    expect(res.body.data.map((s: any) => s.id)).toEqual(["s-every", "s-sup", "s-team"]);
    expect(res.body.data[1]).toMatchObject({ id: "s-sup", status: "closed" });
    expect(res.body.data[0]).toMatchObject({ id: "s-every", status: "active" });
  });

  it("a plain employee sees only EVERYONE + their team surveys", async () => {
    employeeFind.mockResolvedValue({ id: "e1", supervisorId: "boss", teamMemberships: [{ teamId: "t1" }] });
    setAuth({ id: "u-emp", role: "EMPLOYEE" });
    const res = await request(app).get(URL).expect(200);
    expect(res.body.data.map((s: any) => s.id).sort()).toEqual(["s-every", "s-team"]);
  });

  it("a supervisor additionally sees SUPERVISOR_BASED surveys with a chain member in the audience", async () => {
    employeeFind.mockResolvedValue({ id: "sup1", supervisorId: "boss", teamMemberships: [] });
    setAuth({ id: "u-sup", role: "EMPLOYEE" });
    mockChains.mockReturnValue({ downwardChain: jest.fn().mockResolvedValue(["r1"]) });
    // r1 is an audience member of the supervisor-based survey
    audienceFindMany.mockResolvedValue([{ occurrence: { surveyId: "s-sup" } }]);
    const res = await request(app).get(URL).expect(200);
    expect(res.body.data.map((s: any) => s.id).sort()).toEqual(["s-every", "s-sup"]);
  });
});
