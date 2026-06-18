import request from "supertest";
import { app } from "../../../app";
import {
  buildCustomFieldRecord,
  buildHrUser,
  onboardingCustomFieldFindManyMock,
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

describe("GET /api/v1/onboarding/custom-fields - list custom fields", () => {
  beforeEach(() => {
    resetCustomFieldMocks();
  });

  it("returns all custom fields", async () => {
    onboardingCustomFieldFindManyMock.mockResolvedValue([
      buildCustomFieldRecord(),
      buildCustomFieldRecord({
        id: "custom-field-id-2",
        fieldLabel: "TIN Number",
        isRequired: false,
      }),
    ]);

    const response = await request(app)
      .get("/api/v1/onboarding/custom-fields")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Custom fields retrieved successfully",
      data: [
        {
          id: "custom-field-id",
          fieldLabel: "SSS Number",
          isRequired: true,
        },
        {
          id: "custom-field-id-2",
          fieldLabel: "TIN Number",
          isRequired: false,
        },
      ],
    });
  });
});
