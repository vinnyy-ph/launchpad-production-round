import request from "supertest";
import { app } from "../../../app";
import {
  SUBMISSION_ID,
  buildEmployeeUser,
  buildRejectDocumentBody,
  resetDocumentReviewMocks,
} from "./document-reviews-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildEmployeeUser();
    next();
  },
}));

jest.mock("../../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn() },
    onboardingDocumentSubmission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("Document reviews - authorization", () => {
  beforeEach(() => {
    resetDocumentReviewMocks();
  });

  it("returns 403 when a regular employee tries to list submissions", async () => {
    const response = await request(app)
      .get("/api/v1/onboarding/document-reviews")
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 when a regular employee tries to approve a submission", async () => {
    const response = await request(app)
      .patch(`/api/v1/onboarding/document-reviews/${SUBMISSION_ID}/approve`)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 when a regular employee tries to reject a submission", async () => {
    const response = await request(app)
      .patch(`/api/v1/onboarding/document-reviews/${SUBMISSION_ID}/reject`)
      .send(buildRejectDocumentBody())
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });
});
