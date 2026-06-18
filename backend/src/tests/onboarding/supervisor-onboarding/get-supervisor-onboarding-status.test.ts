import request from "supertest";
import { app } from "../../../app";
import { downwardChain } from "../../../modules/shared/org";
import {
  buildSubordinateOnboardingRecord,
  buildSupervisorUser,
  employeeFindUniqueMock,
  mockSupervisorAccess,
  onboardingRecordFindManyMock,
  resetSupervisorOnboardingMocks,
  SUBORDINATE_EMPLOYEE_ID,
  SUPERVISOR_EMPLOYEE_ID,
} from "./supervisor-onboarding-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildSupervisorUser();
    next();
  },
}));

jest.mock("../../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    onboardingRecord: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../../../modules/shared/org", () => ({
  downwardChain: jest.fn(),
}));

const downwardChainMock = jest.mocked(downwardChain);

describe("GET /api/v1/supervisor-onboarding/status", () => {
  beforeEach(() => {
    resetSupervisorOnboardingMocks();
    downwardChainMock.mockReset();
  });

  it("returns 200 with onboarding statuses for subordinates", async () => {
    mockSupervisorAccess();
    downwardChainMock.mockResolvedValue([SUBORDINATE_EMPLOYEE_ID]);
    employeeFindUniqueMock.mockResolvedValue({ id: SUPERVISOR_EMPLOYEE_ID });
    onboardingRecordFindManyMock.mockResolvedValue([buildSubordinateOnboardingRecord()]);

    const response = await request(app)
      .get("/api/v1/supervisor-onboarding/status")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Supervisor onboarding statuses retrieved successfully",
      data: [
        {
          employeeId: SUBORDINATE_EMPLOYEE_ID,
          firstName: "Maria",
          lastName: "Santos",
          jobTitle: "Software Engineer",
          department: "Engineering",
          status: "onboarding",
          onboarding: {
            isComplete: false,
            invitationStatus: "accepted",
            documentsSubmitted: 2,
            documentsRequired: 3,
            customFieldsFilled: 1,
            customFieldsRequired: 2,
          },
        },
      ],
    });

    expect(downwardChainMock).toHaveBeenCalledWith(SUPERVISOR_EMPLOYEE_ID);
    expect(onboardingRecordFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employeeId: { in: [SUBORDINATE_EMPLOYEE_ID] },
        }),
      }),
    );
  });

  it("returns an empty array when no subordinates are onboarding", async () => {
    mockSupervisorAccess();
    downwardChainMock.mockResolvedValue([]);
    employeeFindUniqueMock.mockResolvedValue({ id: SUPERVISOR_EMPLOYEE_ID });
    onboardingRecordFindManyMock.mockResolvedValue([]);

    const response = await request(app)
      .get("/api/v1/supervisor-onboarding/status")
      .expect(200);

    expect(response.body.data).toEqual([]);
  });

  it("filters by status=onboarding query param", async () => {
    mockSupervisorAccess();
    downwardChainMock.mockResolvedValue([SUBORDINATE_EMPLOYEE_ID]);
    employeeFindUniqueMock.mockResolvedValue({ id: SUPERVISOR_EMPLOYEE_ID });
    onboardingRecordFindManyMock.mockResolvedValue([buildSubordinateOnboardingRecord()]);

    await request(app)
      .get("/api/v1/supervisor-onboarding/status?status=onboarding")
      .expect(200);

    expect(onboardingRecordFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isComplete: false,
        }),
      }),
    );
  });

  it("returns 400 for an invalid status query param", async () => {
    mockSupervisorAccess();

    const response = await request(app)
      .get("/api/v1/supervisor-onboarding/status?status=invalid")
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errorCode: "VALIDATION_FAILED",
    });
  });
});
