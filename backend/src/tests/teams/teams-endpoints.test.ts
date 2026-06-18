import request from "supertest";
import { app } from "../../app";
import {
  buildTeamRecord,
  buildViewer,
  employeeCountMock,
  resetTeamMocks,
  teamCountMock,
  teamCreateMock,
  teamFindManyMock,
  teamFindUniqueMock,
  teamMemberCreateManyMock,
  teamMemberDeleteManyMock,
  teamUpdateMock,
} from "./teams-test.helpers";

// Authenticate as HR so team write endpoints (HR/Admin-only via requireRole) are reachable.
jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildViewer({ role: "HR" });
    next();
  },
}));

// Mock only the Prisma surface used by team endpoints.
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
    },
    $transaction: jest.fn(),
  },
}));

describe("Team management endpoints", () => {
  beforeEach(() => {
    resetTeamMocks();
  });

  it("lists teams with pagination metadata", async () => {
    // Teams are collection resources, so the endpoint should return the shared paginated envelope.
    teamFindManyMock.mockResolvedValue([buildTeamRecord({ id: "team-platform", name: "Platform" })]);
    teamCountMock.mockResolvedValue(1);

    const response = await request(app).get("/api/v1/teams?page=2&limit=10").expect(200);

    expect(teamFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: { name: "asc" },
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      meta: {
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
      data: [
        {
          id: "team-platform",
          name: "Platform",
          leader: {
            id: "employee-leader",
            fullName: "Avery Cole",
          },
          memberCount: 2,
        },
      ],
    });
  });

  it("returns teams as employee groups and allows the same employee to appear in many teams", async () => {
    // Team membership is many-to-many: one employee can be grouped into multiple teams at once.
    teamFindManyMock.mockResolvedValue([
      buildTeamRecord({
        id: "team-platform",
        name: "Platform",
        memberIds: ["employee-leader", "employee-shared"],
      }),
      buildTeamRecord({
        id: "team-operations",
        name: "Operations",
        leaderId: "employee-ops-leader",
        memberIds: ["employee-ops-leader", "employee-shared"],
      }),
    ]);
    teamCountMock.mockResolvedValue(2);

    const response = await request(app).get("/api/v1/teams").expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "team-platform",
          members: expect.arrayContaining([expect.objectContaining({ id: "employee-shared" })]),
        }),
        expect.objectContaining({
          id: "team-operations",
          members: expect.arrayContaining([expect.objectContaining({ id: "employee-shared" })]),
        }),
      ]),
    );
  });

  it("creates a team and automatically includes the leader as a member", async () => {
    // The request omits the leader from memberIds to prove the service adds them automatically.
    employeeCountMock.mockResolvedValue(3);
    teamCreateMock.mockResolvedValue(
      buildTeamRecord({
        id: "team-engineering",
        name: "Engineering",
        leaderId: "employee-leader",
        memberIds: ["employee-leader", "employee-member-1", "employee-member-2"],
      }),
    );

    const response = await request(app)
      .post("/api/v1/teams")
      .send({
        name: "Engineering",
        leaderId: "employee-leader",
        memberIds: ["employee-member-1", "employee-member-2"],
      })
      .expect(201);

    expect(employeeCountMock).toHaveBeenCalledWith({
      where: { id: { in: ["employee-leader", "employee-member-1", "employee-member-2"] } },
    });
    expect(teamCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Engineering",
          leaderId: "employee-leader",
          members: {
            createMany: {
              data: [
                { employeeId: "employee-leader" },
                { employeeId: "employee-member-1" },
                { employeeId: "employee-member-2" },
              ],
              skipDuplicates: true,
            },
          },
        }),
      }),
    );
    expect(response.body.data.memberCount).toBe(3);
  });

  it("rejects team creation when any requested employee does not exist", async () => {
    // No team should be persisted if the leader/member set contains an unknown employee id.
    employeeCountMock.mockResolvedValue(1);

    const response = await request(app)
      .post("/api/v1/teams")
      .send({
        name: "Engineering",
        leaderId: "employee-leader",
        memberIds: ["missing-employee"],
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errors: [{ message: "One or more employees were not found" }],
    });
    expect(teamCreateMock).not.toHaveBeenCalled();
  });

  it("updates a team name without changing members", async () => {
    // Team identity edits are intentionally separated from member management.
    teamFindUniqueMock.mockResolvedValue(buildTeamRecord({ name: "Platform" }));
    teamUpdateMock.mockResolvedValue(buildTeamRecord({ name: "Platform Enablement" }));

    const response = await request(app)
      .patch("/api/v1/teams/team-platform")
      .send({ name: "Platform Enablement" })
      .expect(200);

    expect(teamUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "team-platform" },
        data: { name: "Platform Enablement" },
      }),
    );
    expect(response.body.data.name).toBe("Platform Enablement");
  });

  it("adds members without replacing existing team membership", async () => {
    // Add-member requests should append new memberships and leave current memberships untouched.
    teamFindUniqueMock
      .mockResolvedValueOnce(buildTeamRecord({ memberIds: ["employee-leader", "employee-member-1"] }))
      .mockResolvedValueOnce(
        buildTeamRecord({
          memberIds: ["employee-leader", "employee-member-1", "employee-member-2", "employee-member-3"],
        }),
      );
    employeeCountMock.mockResolvedValue(2);
    teamMemberCreateManyMock.mockResolvedValue({ count: 2 });

    const response = await request(app)
      .post("/api/v1/teams/team-platform/members")
      .send({ memberIds: ["employee-member-2", "employee-member-3"] })
      .expect(200);

    expect(teamMemberCreateManyMock).toHaveBeenCalledWith({
      data: [
        { teamId: "team-platform", employeeId: "employee-member-2" },
        { teamId: "team-platform", employeeId: "employee-member-3" },
      ],
      skipDuplicates: true,
    });
    expect(response.body.data.memberCount).toBe(4);
  });

  it("allows adding an employee to another team without removing them from existing teams", async () => {
    // Adding an employee to a second team should create only the new join row for that team.
    teamFindUniqueMock
      .mockResolvedValueOnce(
        buildTeamRecord({
          id: "team-operations",
          name: "Operations",
          leaderId: "employee-ops-leader",
          memberIds: ["employee-ops-leader"],
        }),
      )
      .mockResolvedValueOnce(
        buildTeamRecord({
          id: "team-operations",
          name: "Operations",
          leaderId: "employee-ops-leader",
          memberIds: ["employee-ops-leader", "employee-shared"],
        }),
      );
    employeeCountMock.mockResolvedValue(1);
    teamMemberCreateManyMock.mockResolvedValue({ count: 1 });

    const response = await request(app)
      .post("/api/v1/teams/team-operations/members")
      .send({ memberIds: ["employee-shared"] })
      .expect(200);

    expect(teamMemberCreateManyMock).toHaveBeenCalledWith({
      data: [{ teamId: "team-operations", employeeId: "employee-shared" }],
      skipDuplicates: true,
    });
    expect(response.body.data.members.map((member: { id: string }) => member.id)).toContain(
      "employee-shared",
    );
  });

  it("rejects add-member requests without member ids", async () => {
    // Empty add requests are rejected before the service touches persistence.
    const response = await request(app)
      .post("/api/v1/teams/team-platform/members")
      .send({ memberIds: [] })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errors: [{ message: "At least one team member is required" }],
    });
    expect(teamFindUniqueMock).not.toHaveBeenCalled();
    expect(teamMemberCreateManyMock).not.toHaveBeenCalled();
  });

  it("replaces members while preserving leader membership", async () => {
    // Bulk replacement is still supported, but the leader must survive even when omitted.
    teamFindUniqueMock
      .mockResolvedValueOnce(buildTeamRecord({ leaderId: "employee-leader" }))
      .mockResolvedValueOnce(
        buildTeamRecord({ leaderId: "employee-leader", memberIds: ["employee-leader", "employee-member-4"] }),
      );
    employeeCountMock.mockResolvedValue(2);
    teamMemberDeleteManyMock.mockResolvedValue({ count: 2 });
    teamMemberCreateManyMock.mockResolvedValue({ count: 2 });

    const response = await request(app)
      .put("/api/v1/teams/team-platform/members")
      .send({ memberIds: ["employee-member-4"] })
      .expect(200);

    expect(teamMemberDeleteManyMock).toHaveBeenCalledWith({ where: { teamId: "team-platform" } });
    expect(teamMemberCreateManyMock).toHaveBeenCalledWith({
      data: [
        { teamId: "team-platform", employeeId: "employee-leader" },
        { teamId: "team-platform", employeeId: "employee-member-4" },
      ],
      skipDuplicates: true,
    });
    expect(response.body.data.members.map((member: { id: string }) => member.id)).toEqual([
      "employee-leader",
      "employee-member-4",
    ]);
  });

  it("bulk removes members without removing the team leader", async () => {
    // Bulk removal targets only the requested non-leader member ids.
    teamFindUniqueMock
      .mockResolvedValueOnce(
        buildTeamRecord({
          leaderId: "employee-leader",
          memberIds: ["employee-leader", "employee-member-1", "employee-member-2"],
        }),
      )
      .mockResolvedValueOnce(buildTeamRecord({ leaderId: "employee-leader", memberIds: ["employee-leader"] }));
    teamMemberDeleteManyMock.mockResolvedValue({ count: 2 });

    const response = await request(app)
      .delete("/api/v1/teams/team-platform/members")
      .send({ memberIds: ["employee-member-1", "employee-member-2"] })
      .expect(200);

    expect(teamMemberDeleteManyMock).toHaveBeenCalledWith({
      where: {
        teamId: "team-platform",
        employeeId: { in: ["employee-member-1", "employee-member-2"] },
      },
    });
    expect(response.body.data.members.map((member: { id: string }) => member.id)).toEqual(["employee-leader"]);
  });

  it("rejects bulk remove requests without member ids", async () => {
    // Empty remove requests are treated as invalid input rather than a no-op.
    const response = await request(app)
      .delete("/api/v1/teams/team-platform/members")
      .send({ memberIds: [] })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errors: [{ message: "At least one team member is required" }],
    });
    expect(teamFindUniqueMock).not.toHaveBeenCalled();
    expect(teamMemberDeleteManyMock).not.toHaveBeenCalled();
  });

  it("rejects bulk removal when the request includes the team leader", async () => {
    // The team leader has member-management ability, but their own membership is mandatory.
    teamFindUniqueMock.mockResolvedValue(
      buildTeamRecord({
        leaderId: "employee-leader",
        memberIds: ["employee-leader", "employee-member-1"],
      }),
    );

    const response = await request(app)
      .delete("/api/v1/teams/team-platform/members")
      .send({ memberIds: ["employee-leader", "employee-member-1"] })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errors: [{ message: "Team leader cannot be removed" }],
    });
    expect(teamMemberDeleteManyMock).not.toHaveBeenCalled();
  });

  it("removes one member while preventing leader removal", async () => {
    // The single-member delete endpoint shares the same leader-protection rule as bulk removal.
    teamFindUniqueMock
      .mockResolvedValueOnce(
        buildTeamRecord({
          leaderId: "employee-leader",
          memberIds: ["employee-leader", "employee-member-1"],
        }),
      )
      .mockResolvedValueOnce(buildTeamRecord({ leaderId: "employee-leader", memberIds: ["employee-leader"] }));
    teamMemberDeleteManyMock.mockResolvedValue({ count: 1 });

    const response = await request(app)
      .delete("/api/v1/teams/team-platform/members/employee-member-1")
      .expect(200);

    expect(teamMemberDeleteManyMock).toHaveBeenCalledWith({
      where: {
        teamId: "team-platform",
        employeeId: "employee-member-1",
      },
    });
    expect(response.body.data.memberCount).toBe(1);
  });
});
