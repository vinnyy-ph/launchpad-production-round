import request from "supertest";
import { app } from "../../../app";
import {
  buildCustomFieldRecord,
  buildHrUser,
  CUSTOM_FIELD_ID,
  onboardingCustomFieldFindFirstMock,
  onboardingCustomFieldUpdateMock,
  resetCustomFieldMocks,
} from "./custom-fields-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../../core/database/prisma.service", () => ({
  prisma: {
    onboardingTemplate: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    onboardingCustomField: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("PUT /api/v1/onboarding/custom-fields/:id - update custom field", () => {
  beforeEach(() => {
    resetCustomFieldMocks();
  });

  it("updates a custom field", async () => {
    onboardingCustomFieldFindFirstMock.mockResolvedValue(buildCustomFieldRecord());
    onboardingCustomFieldUpdateMock.mockResolvedValue(
      buildCustomFieldRecord({
        fieldLabel: "PhilHealth Number",
        isRequired: false,
      }),
    );

    const response = await request(app)
      .put(`/api/v1/onboarding/custom-fields/${CUSTOM_FIELD_ID}`)
      .send({
        fieldLabel: "PhilHealth Number",
        isRequired: false,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Custom field updated successfully",
      data: {
        fieldLabel: "PhilHealth Number",
        isRequired: false,
      },
    });
  });

  it("returns 404 when updating a missing custom field", async () => {
    onboardingCustomFieldFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .put("/api/v1/onboarding/custom-fields/missing-id")
      .send({
        fieldLabel: "PhilHealth Number",
        isRequired: false,
      })
      .expect(404);

    expect(response.body.errorCode).toBe("CUSTOM_FIELD_NOT_FOUND");
  });

  it("returns 400 when fieldLabel is missing", async () => {
    const response = await request(app)
      .put(`/api/v1/onboarding/custom-fields/${CUSTOM_FIELD_ID}`)
      .send({
        isRequired: true,
      })
      .expect(400);

    expect(response.body.errorCode).toBe("VALIDATION_FAILED");
  });
});
