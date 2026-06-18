import request from "supertest";
import { app } from "../../../app";
import {
  buildCreateCustomFieldBody,
  buildCustomFieldRecord,
  buildHrUser,
  onboardingCustomFieldCreateMock,
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

describe("POST /api/v1/onboarding/custom-fields - create custom field", () => {
  beforeEach(() => {
    resetCustomFieldMocks();
  });

  it("creates a required custom field and returns 201", async () => {
    onboardingCustomFieldCreateMock.mockResolvedValue(buildCustomFieldRecord());

    const response = await request(app)
      .post("/api/v1/onboarding/custom-fields")
      .send(buildCreateCustomFieldBody())
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Custom field created successfully",
      data: {
        id: "custom-field-id",
        fieldLabel: "SSS Number",
        isRequired: true,
      },
    });

    expect(onboardingCustomFieldCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateId: "template-id",
          fieldLabel: "SSS Number",
          isRequired: true,
        }),
      }),
    );
  });

  it("returns 400 when fieldLabel is missing", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding/custom-fields")
      .send({
        isRequired: true,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errorCode: "VALIDATION_FAILED",
    });
  });

  it("returns 400 when isRequired is not a boolean", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding/custom-fields")
      .send({
        fieldLabel: "SSS Number",
        isRequired: "yes",
      })
      .expect(400);

    expect(response.body.errors[0]).toMatchObject({
      field: "isRequired",
      message: "Invalid isRequired",
    });
  });
});
