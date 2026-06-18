import request from "supertest";
import { app } from "../../../app";
import {
  CUSTOM_FIELD_ID,
  buildCustomFieldRecord,
  buildEmployeeUser,
  buildOnboardingRecord,
  buildSubmitCustomFieldsBody,
  onboardingCustomFieldFindManyMock,
  onboardingCustomFieldValueUpsertMock,
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

describe("POST /api/v1/employee-onboarding/custom-fields", () => {
  beforeEach(() => {
    resetEmployeeOnboardingMocks();
  });

  it("saves custom field values", async () => {
    onboardingRecordFindFirstMock
      .mockResolvedValueOnce(buildOnboardingRecord())
      .mockResolvedValueOnce(buildOnboardingRecord());
    onboardingCustomFieldFindManyMock.mockResolvedValue([buildCustomFieldRecord()]);
    onboardingCustomFieldValueUpsertMock.mockResolvedValue({
      id: "custom-field-value-id",
      recordId: "onboarding-record-id",
      fieldId: CUSTOM_FIELD_ID,
      value: "34-1234567-8",
    });

    const response = await request(app)
      .post("/api/v1/employee-onboarding/custom-fields")
      .send(buildSubmitCustomFieldsBody())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Custom field values saved successfully",
      data: [
        {
          fieldLabel: "SSS Number",
          value: "34-1234567-8",
        },
      ],
    });
  });

  it("returns 400 when fields array is missing", async () => {
    const response = await request(app)
      .post("/api/v1/employee-onboarding/custom-fields")
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
    });
  });

  it("returns 404 when a custom field does not exist on the template", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingCustomFieldFindManyMock.mockResolvedValue([]);

    const response = await request(app)
      .post("/api/v1/employee-onboarding/custom-fields")
      .send(buildSubmitCustomFieldsBody())
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "CUSTOM_FIELD_NOT_FOUND",
    });
  });
});
