import type { User } from "@prisma/client";
import request from "supertest";
import { app } from "../../app";
import {
  buildTeamRecord,
  buildViewer,
  employeeCountMock,
  mockedPrisma,
  resetTeamMocks,
  teamFindManyMock,
  teamCountMock,
  teamFindUniqueMock,
  teamMemberCreateManyMock,
} from "./teams-test.helpers";

// Non-privileged listing resolves the caller's employee id, then scopes the query to their teams.
const employeeFindFirstMock = mockedPrisma.employee.findFirst as unknown as jest.Mock;

// A mutable caller injected by the auth mock; set per scenario. Unset => unauthenticated (401).
let mockCurrentUser: User | undefined;

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, res: { status: (n: number) => { json: (b: unknown) => unknown } }, next: () => void) => {
    if (!mockCurrentUser) {
      return res.status(401).json({ error: "Missing bearer token" });
    }
    req.user = mockCurrentUser;
    return next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    team: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    teamMember: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    employee: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const FORBIDDEN_BODY = {
  success: false,
  message: "You do not have permission to perform this action",
};

describe("Team management authorization", () => {
  beforeEach(() => {
    resetTeamMocks();
    employeeFindFirstMock.mockReset();
    mockCurrentUser = undefined;
  });

  it("rejects an unauthenticated request to list teams", async () => {
    await request(app).get("/api/v1/teams").expect(401);
  });

  it("returns all teams to an HR caller (no membership scoping)", async () => {
    mockCurrentUser = buildViewer({ role: "HR" }) as User;
    teamFindManyMock.mockResolvedValue([buildTeamRecord({ id: "team-platform", name: "Platform" })]);
    teamCountMock.mockResolvedValue(1);

    await request(app).get("/api/v1/teams").expect(200);

    expect(employeeFindFirstMock).not.toHaveBeenCalled();
    expect(teamFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("scopes the team list to the caller's own teams for a non-HR/Admin user", async () => {
    mockCurrentUser = buildViewer({ role: "EMPLOYEE" }) as User;
    employeeFindFirstMock.mockResolvedValue({ id: "employee-member-1" });
    teamFindManyMock.mockResolvedValue([buildTeamRecord({ id: "team-platform", name: "Platform" })]);
    teamCountMock.mockResolvedValue(1);

    await request(app).get("/api/v1/teams").expect(200);

    // The list query is filtered to teams the caller leads or belongs to.
    expect(teamFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { leaderId: "employee-member-1" },
            { members: { some: { employeeId: "employee-member-1" } } },
          ],
        },
      }),
    );
  });

  it("returns 403 for a non-HR/Admin caller creating a team", async () => {
    mockCurrentUser = buildViewer({ role: "EMPLOYEE" }) as User;

    const response = await request(app)
      .post("/api/v1/teams")
      .send({ name: "Engineering", leaderId: "employee-leader", memberIds: ["employee-member-1"] })
      .expect(403);

    expect(response.body).toEqual(FORBIDDEN_BODY);
  });

  it("returns 403 for a non-HR/Admin caller adding team members", async () => {
    mockCurrentUser = buildViewer({ role: "EMPLOYEE" }) as User;

    const response = await request(app)
      .post("/api/v1/teams/team-platform/members")
      .send({ memberIds: ["employee-member-2"] })
      .expect(403);

    expect(response.body).toEqual(FORBIDDEN_BODY);
  });

  it("returns 403 for a non-HR/Admin caller removing a team member", async () => {
    mockCurrentUser = buildViewer({ role: "EMPLOYEE" }) as User;

    const response = await request(app)
      .delete("/api/v1/teams/team-platform/members/employee-member-1")
      .expect(403);

    expect(response.body).toEqual(FORBIDDEN_BODY);
  });

  it("lets a team's own leader add members even without an HR/Admin role", async () => {
    // A team leader's extra ability is managing their team's membership, so the request succeeds.
    mockCurrentUser = buildViewer({ role: "EMPLOYEE" }) as User;
    employeeFindFirstMock.mockResolvedValue({ id: "employee-leader" });
    teamFindUniqueMock
      // First lookup authorizes the caller as the team leader (middleware).
      .mockResolvedValueOnce(buildTeamRecord({ leaderId: "employee-leader" }))
      // Subsequent lookups serve the add-members service flow.
      .mockResolvedValueOnce(buildTeamRecord({ leaderId: "employee-leader" }))
      .mockResolvedValueOnce(
        buildTeamRecord({
          leaderId: "employee-leader",
          memberIds: ["employee-leader", "employee-member-1", "employee-member-2"],
        }),
      );
    employeeCountMock.mockResolvedValue(1);
    teamMemberCreateManyMock.mockResolvedValue({ count: 1 });

    await request(app)
      .post("/api/v1/teams/team-platform/members")
      .send({ memberIds: ["employee-member-2"] })
      .expect(200);
  });

  it("rejects a team leader managing a team they do not lead", async () => {
    // Leadership is per-team: leading one team grants no rights over another.
    mockCurrentUser = buildViewer({ role: "EMPLOYEE" }) as User;
    employeeFindFirstMock.mockResolvedValue({ id: "employee-other-leader" });
    teamFindUniqueMock.mockResolvedValue(buildTeamRecord({ leaderId: "employee-leader" }));

    const response = await request(app)
      .delete("/api/v1/teams/team-platform/members/employee-member-1")
      .expect(403);

    expect(response.body).toEqual(FORBIDDEN_BODY);
  });
});
