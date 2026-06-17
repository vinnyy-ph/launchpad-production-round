import type { Role } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";

export const TEMPLATE_ID = "template-id";
export const DOCUMENT_ID = "document-id";

export const mockedPrisma = jest.mocked(prisma);
export const onboardingTemplateFindFirstMock =
  mockedPrisma.onboardingTemplate.findFirst as jest.Mock;
export const onboardingTemplateCreateMock =
  mockedPrisma.onboardingTemplate.create as jest.Mock;
export const onboardingDocumentFindManyMock =
  mockedPrisma.onboardingDocument.findMany as jest.Mock;
export const onboardingDocumentFindFirstMock =
  mockedPrisma.onboardingDocument.findFirst as jest.Mock;
export const onboardingDocumentCreateMock =
  mockedPrisma.onboardingDocument.create as jest.Mock;
export const onboardingDocumentUpdateMock =
  mockedPrisma.onboardingDocument.update as jest.Mock;
export const onboardingDocumentDeleteMock =
  mockedPrisma.onboardingDocument.delete as jest.Mock;

/** Clears all required-documents Prisma mocks before each test. */
export function resetDocumentMocks() {
  onboardingTemplateFindFirstMock.mockReset();
  onboardingTemplateCreateMock.mockReset();
  onboardingDocumentFindManyMock.mockReset();
  onboardingDocumentFindFirstMock.mockReset();
  onboardingDocumentCreateMock.mockReset();
  onboardingDocumentUpdateMock.mockReset();
  onboardingDocumentDeleteMock.mockReset();

  onboardingTemplateFindFirstMock.mockResolvedValue(buildTemplateRecord());
}

/** Minimal HR account injected by the auth mock. */
export function buildHrUser() {
  return {
    id: "hr-user-id",
    email: "hr@example.com",
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
    email: "employee@example.com",
    googleId: null,
    role: "EMPLOYEE" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

export function buildTemplateRecord() {
  return {
    id: TEMPLATE_ID,
    name: "Default",
    isDefault: true,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
  };
}

export function buildDocumentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: DOCUMENT_ID,
    templateId: TEMPLATE_ID,
    documentName: "NBI Clearance",
    instructions:
      "Upload a clear scanned copy of your NBI Clearance issued within the last 6 months.",
    allowedFileTypes: "pdf",
    isRequired: true,
    createdAt: new Date("2026-06-17T08:00:00.000Z"),
    updatedAt: new Date("2026-06-17T08:00:00.000Z"),
    ...overrides,
  };
}

export function buildCreateDocumentBody() {
  return {
    documentName: "NBI Clearance",
    instructions:
      "Upload a clear scanned copy of your NBI Clearance issued within the last 6 months.",
    allowedFileTypes: "pdf",
    isRequired: true,
  };
}
