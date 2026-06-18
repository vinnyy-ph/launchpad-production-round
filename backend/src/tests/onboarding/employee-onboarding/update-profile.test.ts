import request from "supertest";
import { app } from "../../../app";
import {
  buildEmployeeUser,
  buildOnboardingRecord,
  buildUpdateProfileBody,
  employeeFindManyMock,
  employeeUpdateMock,
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

describe("PATCH /api/v1/employee-onboarding/profile", () => {
  beforeEach(() => {
    resetEmployeeOnboardingMocks();
  });

  it("updates the employee onboarding profile", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    employeeFindManyMock.mockResolvedValue([]);
    employeeUpdateMock.mockResolvedValue({
      ...buildOnboardingRecord().employee,
      emergencyContact: "Juan Santos - +63 917 123 4567",
    });

    const response = await request(app)
      .patch("/api/v1/employee-onboarding/profile")
      .send(buildUpdateProfileBody())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Onboarding profile updated successfully",
      data: {
        firstName: "Maria",
        lastName: "Santos",
        personalEmail: "maria.santos.personal@gmail.com",
      },
    });
  });

  it("returns 400 when the request body is empty", async () => {
    const response = await request(app)
      .patch("/api/v1/employee-onboarding/profile")
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
    });
  });

  it("returns 400 for an invalid emergency contact phone number", async () => {
    const response = await request(app)
      .patch("/api/v1/employee-onboarding/profile")
      .send({
        emergencyContact: "Juan Santos - 12345",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVALID_EMERGENCY_CONTACT_PHONE",
    });
  });
});
