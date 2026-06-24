import request from "supertest";
import { app } from "../../../app";
import {
  DOCUMENT_ID,
  buildHrUser,
  resetEmployeeOnboardingMocks,
} from "./employee-onboarding-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
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

describe("Employee onboarding - authorization", () => {
  beforeEach(() => {
    resetEmployeeOnboardingMocks();
  });

  it("returns 403 when HR tries to accept an invitation", async () => {
    const response = await request(app)
      .post("/api/v1/employee-onboarding/accept-invitation")
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 when HR tries to view employee onboarding status", async () => {
    const response = await request(app)
      .get("/api/v1/employee-onboarding/status")
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 when HR tries to submit a document", async () => {
    const response = await request(app)
      .post(`/api/v1/employee-onboarding/documents/${DOCUMENT_ID}/submit`)
      .send({
        fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1710000000/onboarding/maria-santos/nbi-clearance.pdf",
      })
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });
});
