import request from "supertest";
import { app } from "../../app";
import {
  buildHrUser,
  buildOffboardingRecord,
  NEW_SUPERVISOR_ID,
  OFFBOARDEE_ID,
  OFFBOARDING_ID,
} from "./offboarding-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    offboardingRecord: { findUnique: jest.fn() },
    team: { updateMany: jest.fn() },
    teamMember: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("../../core/database/prisma.service");

describe("POST /api/v1/offboarding/:id/reassign", () => {
  beforeEach(() => {
    prisma.employee.findUnique.mockReset();
    prisma.employee.findMany.mockReset();
    prisma.employee.updateMany.mockReset();
    prisma.offboardingRecord.findUnique.mockReset();
    prisma.team.updateMany.mockReset();
    prisma.teamMember.findMany.mockReset();
    prisma.$transaction.mockReset();
    // Default: no reports/members carry a department -> same-department rule is a no-op.
    prisma.employee.findMany.mockResolvedValue([]);
    prisma.teamMember.findMany.mockResolvedValue([]);
  });

  it("reassigns the offboardee's direct reports and led teams to the new supervisor", async () => {
    prisma.offboardingRecord.findUnique.mockResolvedValue(buildOffboardingRecord());
    prisma.employee.findUnique.mockResolvedValue({
      id: NEW_SUPERVISOR_ID,
      firstName: "Nina",
      lastName: "Lead",
      status: "ACTIVE",
    });
    prisma.employee.updateMany.mockResolvedValue({ count: 3 });
    prisma.team.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        employee: { updateMany: prisma.employee.updateMany },
        team: { updateMany: prisma.team.updateMany },
      }),
    );

    const response = await request(app)
      .post(`/api/v1/offboarding/${OFFBOARDING_ID}/reassign`)
      .send({ newSupervisorId: NEW_SUPERVISOR_ID })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        offboardingId: OFFBOARDING_ID,
        reassignedReports: 3,
        reassignedTeams: 1,
        newSupervisorId: NEW_SUPERVISOR_ID,
        newTeamLeaderId: NEW_SUPERVISOR_ID,
      },
    });
    expect(prisma.employee.updateMany).toHaveBeenCalledWith({
      where: { supervisorId: OFFBOARDEE_ID },
      data: { supervisorId: NEW_SUPERVISOR_ID },
    });
    expect(prisma.team.updateMany).toHaveBeenCalledWith({
      where: { leaderId: OFFBOARDEE_ID },
      data: { leaderId: NEW_SUPERVISOR_ID },
    });
  });

  it("rejects a new supervisor from a different department than a report", async () => {
    prisma.offboardingRecord.findUnique.mockResolvedValue(buildOffboardingRecord());
    prisma.employee.findUnique.mockResolvedValue({
      id: NEW_SUPERVISOR_ID,
      firstName: "Nina",
      lastName: "Lead",
      status: "ACTIVE",
      departmentId: "dept-sales",
    });
    // One report lives in Engineering — the Sales supervisor may not manage it.
    prisma.employee.findMany.mockResolvedValue([{ id: "report-1", departmentId: "dept-eng" }]);

    const response = await request(app)
      .post(`/api/v1/offboarding/${OFFBOARDING_ID}/reassign`)
      .send({ newSupervisorId: NEW_SUPERVISOR_ID })
      .expect(400);

    expect(response.body.errors[0].field).toBe("newSupervisorId");
    expect(prisma.employee.updateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when the offboarding record does not exist", async () => {
    prisma.offboardingRecord.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/v1/offboarding/${OFFBOARDING_ID}/reassign`)
      .send({ newSupervisorId: NEW_SUPERVISOR_ID })
      .expect(404);

    expect(response.body).toMatchObject({ errorCode: "OFFBOARDING_RECORD_NOT_FOUND" });
  });
});
