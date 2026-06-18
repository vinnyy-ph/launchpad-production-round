import request from "supertest";
import { app } from "../../../app";
import {
  buildEmployeeUser,
  buildOnboardingRecord,
  onboardingRecordFindFirstMock,
  resetEmployeeOnboardingMocks,
} from "./employee-onboarding-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildEmployeeUser();
    next();
  },
}));

jest.mock("../../../core/database/prisma.service", () => ({
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

describe("GET /api/v1/employee-onboarding/status", () => {
  beforeEach(() => {
    resetEmployeeOnboardingMocks();
  });

  it("returns onboarding checklist and progress", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());

    const response = await request(app)
      .get("/api/v1/employee-onboarding/status")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Onboarding status retrieved successfully",
      data: {
        recordId: "onboarding-record-id",
        isComplete: false,
        profile: {
          firstName: "Maria",
          lastName: "Santos",
          department: "People Operations",
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
  });

  it("returns 404 when no onboarding record exists", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/v1/employee-onboarding/status")
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "EMPLOYEE_ONBOARDING_NOT_FOUND",
    });
  });
});
