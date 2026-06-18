import request from "supertest";
import { app } from "../../app";
import {
  buildEmployeeUser,
  buildHrUser,
  buildOnboardingRecord,
  EMPLOYEE_ID,
  onboardingRecordFindFirstMock,
  resetEmployeeOnboardingMocks,
} from "./employee-onboarding/employee-onboarding-test.helpers";

// Mutable holder so each test can pick the authenticated user (or none, for the
// unauthenticated case). The `mock` prefix lets jest hoist the reference safely.
let mockAuthUser:
  | ReturnType<typeof buildHrUser>
  | ReturnType<typeof buildEmployeeUser>
  | null = null;

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    if (mockAuthUser) {
      req.user = mockAuthUser;
    }
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    onboardingRecord: { findFirst: jest.fn(), update: jest.fn() },
    onboardingInvitation: { findFirst: jest.fn(), update: jest.fn() },
    employee: { findMany: jest.fn(), update: jest.fn() },
    onboardingDocument: { findFirst: jest.fn() },
    onboardingDocumentSubmission: { findFirst: jest.fn(), create: jest.fn() },
    onboardingCustomField: { findMany: jest.fn() },
    onboardingCustomFieldValue: { upsert: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe("GET /api/v1/onboarding/:employeeId/status - HR onboarding status", () => {
  beforeEach(() => {
    resetEmployeeOnboardingMocks();
    mockAuthUser = buildHrUser();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    mockAuthUser = null;

    const response = await request(app)
      .get(`/api/v1/onboarding/${EMPLOYEE_ID}/status`)
      .expect(401);

    expect(response.body).toEqual({ error: "Not authenticated" });
  });

  it("returns 403 when a regular employee requests another hire's status", async () => {
    mockAuthUser = buildEmployeeUser();

    const response = await request(app)
      .get(`/api/v1/onboarding/${EMPLOYEE_ID}/status`)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 200 with the hire's custom-field answers and document statuses for HR", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());

    const response = await request(app)
      .get(`/api/v1/onboarding/${EMPLOYEE_ID}/status`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Onboarding status retrieved successfully",
      data: {
        isComplete: false,
        profile: {
          firstName: "Maria",
          lastName: "Santos",
        },
        documents: [
          {
            documentName: "NBI Clearance",
            isRequired: true,
          },
        ],
        customFields: [
          {
            fieldLabel: "SSS Number",
            value: "34-1234567-8",
          },
        ],
      },
    });
    // Located by employee id (HR-scoped lookup), not by session user id.
    expect(onboardingRecordFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: EMPLOYEE_ID } }),
    );
  });

  it("returns 404 when no onboarding record exists for the employee", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/v1/onboarding/${EMPLOYEE_ID}/status`)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ONBOARDING_RECORD_NOT_FOUND",
    });
  });
});
