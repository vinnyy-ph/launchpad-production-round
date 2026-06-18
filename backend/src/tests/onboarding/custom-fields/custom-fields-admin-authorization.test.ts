import request from "supertest";
import { app } from "../../../app";
import {
  buildAdminUser,
  buildCreateCustomFieldBody,
  resetCustomFieldMocks,
} from "./custom-fields-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildAdminUser();
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

describe("Custom fields - admin authorization", () => {
  beforeEach(() => {
    resetCustomFieldMocks();
  });

  it("returns 403 when an admin tries to create a custom field", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding/custom-fields")
      .send(buildCreateCustomFieldBody())
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 when an admin tries to list custom fields", async () => {
    const response = await request(app)
      .get("/api/v1/onboarding/custom-fields")
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });
});
