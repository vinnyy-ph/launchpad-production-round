import request from "supertest";
import { app } from "../../../app";
import {
  buildCustomFieldRecord,
  buildHrUser,
  CUSTOM_FIELD_ID,
  onboardingCustomFieldFindFirstMock,
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

describe("GET /api/v1/onboarding/custom-fields/:id - get custom field", () => {
  beforeEach(() => {
    resetCustomFieldMocks();
  });

  it("returns a custom field by ID", async () => {
    onboardingCustomFieldFindFirstMock.mockResolvedValue(buildCustomFieldRecord());

    const response = await request(app)
      .get(`/api/v1/onboarding/custom-fields/${CUSTOM_FIELD_ID}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Custom field retrieved successfully",
      data: {
        id: CUSTOM_FIELD_ID,
        fieldLabel: "SSS Number",
        isRequired: true,
      },
    });
  });

  it("returns 404 when the custom field does not exist", async () => {
    onboardingCustomFieldFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/v1/onboarding/custom-fields/missing-id")
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Custom field not found",
      errorCode: "CUSTOM_FIELD_NOT_FOUND",
    });
  });
});
