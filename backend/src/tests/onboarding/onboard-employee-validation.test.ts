import request from "supertest";
import { app } from "../../app";
import {
  buildHrUser,
  resetOnboardingMocks,
  transactionMock,
  userFindUniqueMock,
} from "./onboarding-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    employee: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe("POST /api/v1/onboarding - validation", () => {
  beforeEach(() => {
    resetOnboardingMocks();
  });

  it("returns 400 when companyEmail is missing", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        jobTitle: "Engineer",
        supervisorId: "some-id",
        department: "Engineering",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errorCode: "VALIDATION_FAILED",
      errors: [
        expect.objectContaining({
          field: "companyEmail",
          message: "companyEmail is required",
        }),
      ],
    });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when jobTitle is missing", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        companyEmail: "test@example.com",
        supervisorId: "some-id",
        department: "Engineering",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
      errors: [
        expect.objectContaining({
          field: "jobTitle",
          message: "jobTitle is required",
        }),
      ],
    });
  });

  it("returns 400 when supervisorId is missing", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        companyEmail: "test@example.com",
        jobTitle: "Engineer",
        department: "Engineering",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
      errors: [
        expect.objectContaining({
          field: "supervisorId",
          message: "supervisorId is required",
        }),
      ],
    });
  });

  it("returns 400 when department is missing", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        companyEmail: "test@example.com",
        jobTitle: "Engineer",
        supervisorId: "some-id",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
      errors: [
        expect.objectContaining({
          field: "department",
          message: "department is required",
        }),
      ],
    });
  });

  it("returns 400 when companyEmail is an empty string", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        companyEmail: "   ",
        jobTitle: "Engineer",
        supervisorId: "some-id",
        department: "Engineering",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
      errors: [
        expect.objectContaining({
          field: "companyEmail",
          message: "companyEmail is required",
        }),
      ],
    });
  });
});
