import request from "supertest";
import { app } from "../../../app";
import {
  buildCustomFieldRecord,
  buildHrUser,
  CUSTOM_FIELD_ID,
  onboardingCustomFieldDeleteMock,
  onboardingCustomFieldFindFirstMock,
  resetCustomFieldMocks,
} from "./custom-fields-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../../core/database/prisma.service", () => {
  const prisma: Record<string, unknown> = {
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
    onboardingCustomFieldValue: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
  };
  return { prisma };
});

describe("DELETE /api/v1/onboarding/custom-fields/:id - delete custom field", () => {
  beforeEach(() => {
    resetCustomFieldMocks();
  });

  it("deletes a custom field", async () => {
    onboardingCustomFieldFindFirstMock.mockResolvedValue(buildCustomFieldRecord());
    onboardingCustomFieldDeleteMock.mockResolvedValue(buildCustomFieldRecord());

    const response = await request(app)
      .delete(`/api/v1/onboarding/custom-fields/${CUSTOM_FIELD_ID}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Custom field deleted successfully",
      data: {
        id: CUSTOM_FIELD_ID,
        fieldLabel: "SSS Number",
      },
    });
  });

  it("returns 404 when deleting a missing custom field", async () => {
    onboardingCustomFieldFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .delete("/api/v1/onboarding/custom-fields/missing-id")
      .expect(404);

    expect(response.body.errorCode).toBe("CUSTOM_FIELD_NOT_FOUND");
  });
});
