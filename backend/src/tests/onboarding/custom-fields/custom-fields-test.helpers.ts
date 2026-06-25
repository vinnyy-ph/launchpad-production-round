import type { Role } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";

export const TEMPLATE_ID = "template-id";
export const CUSTOM_FIELD_ID = "custom-field-id";

export const mockedPrisma = jest.mocked(prisma);
export const onboardingTemplateFindFirstMock =
  mockedPrisma.onboardingTemplate.findFirst as jest.Mock;
export const onboardingTemplateCreateMock =
  mockedPrisma.onboardingTemplate.create as jest.Mock;
export const onboardingCustomFieldFindManyMock =
  mockedPrisma.onboardingCustomField.findMany as jest.Mock;
export const onboardingCustomFieldFindFirstMock =
  mockedPrisma.onboardingCustomField.findFirst as jest.Mock;
export const onboardingCustomFieldCreateMock =
  mockedPrisma.onboardingCustomField.create as jest.Mock;
export const onboardingCustomFieldUpdateMock =
  mockedPrisma.onboardingCustomField.update as jest.Mock;
export const onboardingCustomFieldDeleteMock =
  mockedPrisma.onboardingCustomField.delete as jest.Mock;

/** Clears all custom-fields Prisma mocks before each test. */
export function resetCustomFieldMocks() {
  onboardingTemplateFindFirstMock.mockReset();
  onboardingTemplateCreateMock.mockReset();
  onboardingCustomFieldFindManyMock.mockReset();
  onboardingCustomFieldFindFirstMock.mockReset();
  onboardingCustomFieldCreateMock.mockReset();
  onboardingCustomFieldUpdateMock.mockReset();
  onboardingCustomFieldDeleteMock.mockReset();

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

/** Admin account for authorization tests. */
export function buildAdminUser() {
  return {
    id: "admin-user-id",
    email: "admin@example.com",
    googleId: null,
    role: "ADMIN" as Role,
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

export function buildCustomFieldRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: CUSTOM_FIELD_ID,
    templateId: TEMPLATE_ID,
    fieldLabel: "SSS Number",
    isRequired: true,
    createdAt: new Date("2026-06-17T08:00:00.000Z"),
    updatedAt: new Date("2026-06-17T08:00:00.000Z"),
    ...overrides,
  };
}

export function buildCreateCustomFieldBody() {
  return {
    fieldLabel: "SSS Number",
    isRequired: true,
  };
}
