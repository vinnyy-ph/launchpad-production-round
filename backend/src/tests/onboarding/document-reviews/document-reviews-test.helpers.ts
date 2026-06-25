import type { Role } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";

export const SUBMISSION_ID = "submission-id";
export const RECORD_ID = "onboarding-record-id";
export const DOCUMENT_ID = "document-id";
export const EMPLOYEE_ID = "employee-id";
export const HR_USER_ID = "hr-user-id";
export const HR_EMPLOYEE_ID = "hr-employee-id";

export const mockedPrisma = jest.mocked(prisma);
export const employeeFindUniqueMock = mockedPrisma.employee.findUnique as jest.Mock;
export const onboardingDocumentSubmissionFindManyMock =
  mockedPrisma.onboardingDocumentSubmission.findMany as jest.Mock;
export const onboardingDocumentSubmissionFindUniqueMock =
  mockedPrisma.onboardingDocumentSubmission.findUnique as jest.Mock;
export const onboardingDocumentSubmissionUpdateMock =
  mockedPrisma.onboardingDocumentSubmission.update as jest.Mock;

/** Clears all document-review Prisma mocks before each test. */
export function resetDocumentReviewMocks() {
  employeeFindUniqueMock.mockReset();
  onboardingDocumentSubmissionFindManyMock.mockReset();
  onboardingDocumentSubmissionFindUniqueMock.mockReset();
  onboardingDocumentSubmissionUpdateMock.mockReset();

  employeeFindUniqueMock.mockResolvedValue({ id: HR_EMPLOYEE_ID });
}

/** Minimal HR account injected by the auth mock. */
export function buildHrUser() {
  return {
    id: HR_USER_ID,
    email: "hr@launchpad.ph",
    googleId: null,
    role: "HR" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/** Regular employee account for authorization tests. */
export function buildEmployeeUser() {
  return {
    id: "employee-user-id",
    email: "maria.santos@launchpad.ph",
    googleId: "google-uid",
    role: "EMPLOYEE" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/** Admin account for authorization tests. */
export function buildAdminUser() {
  return {
    id: "admin-user-id",
    email: "admin@launchpad.ph",
    googleId: null,
    role: "ADMIN" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

export function buildSubmissionRecord(overrides: Record<string, unknown> = {}) {
  const reviewedAt =
    overrides.reviewedAt === undefined ? null : overrides.reviewedAt;

  return {
    id: SUBMISSION_ID,
    recordId: RECORD_ID,
    documentId: DOCUMENT_ID,
    fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1710000000/onboarding/maria-santos/nbi-clearance.pdf",
    status: "PENDING",
    rejectionNote: null,
    reviewerId: null,
    submittedAt: new Date("2026-06-17T10:00:00.000Z"),
    reviewedAt,
    createdAt: new Date("2026-06-17T10:00:00.000Z"),
    updatedAt: new Date("2026-06-17T10:00:00.000Z"),
    document: {
      id: DOCUMENT_ID,
      documentName: "NBI Clearance",
    },
    record: {
      employee: {
        id: EMPLOYEE_ID,
        firstName: "Maria",
        lastName: "Santos",
        middleName: "Cruz",
        companyEmail: "maria.santos@launchpad.ph",
        jobTitle: "HR Coordinator",
      },
    },
    ...overrides,
  };
}

export function buildRejectDocumentBody() {
  return {
    rejectionNote:
      "The NBI Clearance scan is too blurry to read. Please upload a clearer PDF copy issued within the last 6 months.",
  };
}
