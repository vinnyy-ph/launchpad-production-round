import request from "supertest";
import { app } from "../../../app";
import {
  buildEmployeeUser,
  buildOnboardingRecord,
  buildSubmissionRecord,
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

describe("GET /api/v1/employee-onboarding/status", () => {
  const env = process.env;

  beforeAll(() => {
    // Resolving document URLs into proxy paths signs a capability token with this secret.
    process.env = { ...env, CLOUDINARY_API_SECRET: "test-secret" };
  });

  afterAll(() => {
    process.env = env;
  });

  beforeEach(() => {
    resetEmployeeOnboardingMocks();
  });

  it("returns onboarding checklist and progress", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());

    const response = await request(app)
      .get("/api/v1/employee-onboarding/status")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Onboarding status retrieved successfully",
      data: {
        recordId: "onboarding-record-id",
        isComplete: false,
        profile: {
          firstName: "Maria",
          lastName: "Santos",
          department: "People Operations",
        },
        documents: [
          {
            documentName: "NBI Clearance",
            isRequired: true,
          },
        ],
        customFields: [
          {
            fieldLabel: "SSS Number",
            value: "34-1234567-8",
          },
        ],
      },
    });
  });

  it("returns status when the latest submission has a legacy external file URL", async () => {
    const legacyUrl = "https://storage.example.com/onboarding/nbi-clearance.pdf";
    onboardingRecordFindFirstMock.mockResolvedValue(
      buildOnboardingRecord({
        documentSubmissions: [buildSubmissionRecord({ fileUrl: legacyUrl })],
      }),
    );

    const response = await request(app)
      .get("/api/v1/employee-onboarding/status")
      .expect(200);

    const latestSubmission =
      response.body.data.documents[0].latestSubmission;
    expect(latestSubmission).toMatchObject({
      id: "submission-id",
      status: "pending",
    });
    // Legacy external URLs are proxied through our own origin so they stay viewable
    // under the page CSP instead of being framed cross-origin.
    expect(latestSubmission.fileUrl).toMatch(
      /^\/api\/v1\/documents\/view\/nbi-clearance\.pdf\?token=/,
    );
  });

  it("returns 404 when no onboarding record exists", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/v1/employee-onboarding/status")
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "EMPLOYEE_ONBOARDING_NOT_FOUND",
    });
  });
});
