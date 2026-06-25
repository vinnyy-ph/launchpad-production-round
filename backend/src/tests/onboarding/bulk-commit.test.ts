import request from "supertest";
import { app } from "../../app";
import {
  RECORD_ID,
  buildHrUser,
  buildInvitationRecord,
  buildOnboardingRecord,
  mockSuccessfulInvitationUpdate,
  onboardingRecordFindFirstMock,
  resetInvitationMocks,
} from "./invitation/invitation-test.helpers";
import {
  buildSupervisorRecord,
  employeeFindFirstMock,
  employeeFindManyMock,
  employeeFindUniqueMock,
  mockOnboardingTransaction,
  resetOnboardingMocks,
  userFindUniqueMock,
} from "./onboarding-test.helpers";
import { prisma } from "../../core/database/prisma.service";

const userFindManyMock = prisma.user.findMany as jest.Mock;

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    employee: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    employeeEmergencyContact: { findMany: jest.fn().mockResolvedValue([]) },
    onboardingRecord: { findFirst: jest.fn() },
    onboardingInvitation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    onboardingInvitationResendAttempt: { count: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../core/email", () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
  })),
}));

function buildBulkRow() {
  return {
    rowNumber: 1,
    companyEmail: "bulk.hire@example.com",
    firstName: "Bulk",
    lastName: "Hire",
    jobTitle: "Software Engineer",
    department: "Engineering",
    supervisorEmail: "jane.manager@example.com",
  };
}

describe("POST /api/v1/onboarding/bulk/commit", () => {
  beforeEach(() => {
    resetOnboardingMocks();
    resetInvitationMocks();

    userFindUniqueMock.mockResolvedValue(null);
    userFindManyMock.mockResolvedValue([]);
    employeeFindUniqueMock.mockResolvedValue(null);
    employeeFindManyMock.mockImplementation(async (args: { where?: Record<string, unknown> }) => {
      const where = args?.where ?? {};

      if ("companyEmail" in where) {
        const filter = where.companyEmail as { in?: string[] };
        if (filter.in?.includes("jane.manager@example.com")) {
          return [
            {
              ...buildSupervisorRecord(),
              companyEmail: "jane.manager@example.com",
            },
          ];
        }

        return [];
      }

      return [];
    });
    employeeFindFirstMock.mockResolvedValue(buildSupervisorRecord());
    mockOnboardingTransaction({ companyEmail: "bulk.hire@example.com" });

    onboardingRecordFindFirstMock.mockResolvedValue(
      buildOnboardingRecord({
        id: RECORD_ID,
        invitations: [buildInvitationRecord({ sentAt: new Date() })],
      }),
    );
    mockSuccessfulInvitationUpdate();
  });

  it("returns 201 with created employees after commit", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding/bulk/commit")
      .send({ rows: [buildBulkRow()] })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        created: [
          expect.objectContaining({
            employee: expect.objectContaining({
              companyEmail: "bulk.hire@example.com",
            }),
            onboardingRecord: expect.objectContaining({ id: "record-id" }),
          }),
        ],
        inviteFailures: [],
      },
    });
  });
});
