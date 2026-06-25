import type { Role } from "@prisma/client";
import { prisma } from "../../core/database/prisma.service";

export const EMPLOYEE_ID = "660e8400-e29b-41d4-a716-446655440001";
export const RECORD_ID = "770e8400-e29b-41d4-a716-446655440002";
export const TEMPLATE_ID = "template-id";
export const DOCUMENT_ID = "document-id";
export const CUSTOM_FIELD_ID = "custom-field-id";
export const SUBMISSION_ID = "submission-id";
export const HR_USER_ID = "hr-user-id";

export const mockedPrisma = jest.mocked(prisma);
export const onboardingRecordFindFirstMock =
  mockedPrisma.onboardingRecord.findFirst as jest.Mock;
export const onboardingRecordUpdateMock =
  mockedPrisma.onboardingRecord.update as jest.Mock;
export const employeeUpdateMock = mockedPrisma.employee.update as jest.Mock;
export const transactionMock = mockedPrisma.$transaction as jest.Mock;

/** Clears HR complete onboarding Prisma mocks before each test. */
export function resetHrCompleteOnboardingMocks() {
  onboardingRecordFindFirstMock.mockReset();
  onboardingRecordUpdateMock.mockReset();
  employeeUpdateMock.mockReset();
  transactionMock.mockReset();

  transactionMock.mockImplementation(async (operations: unknown) => {
    if (Array.isArray(operations)) {
      return Promise.all(operations);
    }

    if (typeof operations === "function") {
      return operations(mockedPrisma);
    }

    return operations;
  });
}

/** HR account injected by the auth mock. */
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

export function buildDocumentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: DOCUMENT_ID,
    templateId: TEMPLATE_ID,
    documentName: "NBI Clearance",
    instructions: "Upload a clear scanned copy issued within the last 6 months.",
    allowedFileTypes: "pdf",
    isRequired: true,
    createdAt: new Date("2026-06-17T08:00:00.000Z"),
    updatedAt: new Date("2026-06-17T08:00:00.000Z"),
    ...overrides,
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

export function buildSubmissionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: SUBMISSION_ID,
    recordId: RECORD_ID,
    documentId: DOCUMENT_ID,
    fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1710000000/onboarding/maria-santos/nbi-clearance.pdf",
    status: "APPROVED",
    rejectionNote: null,
    reviewerId: HR_USER_ID,
    submittedAt: new Date("2026-06-17T10:00:00.000Z"),
    reviewedAt: new Date("2026-06-17T11:00:00.000Z"),
    createdAt: new Date("2026-06-17T10:00:00.000Z"),
    updatedAt: new Date("2026-06-17T11:00:00.000Z"),
    ...overrides,
  };
}

export function buildOnboardingRecord(overrides: Record<string, unknown> = {}) {
  const {
    employee: employeeOverrides,
    template: templateOverrides,
    documentSubmissions,
    customFieldValues,
    ...recordOverrides
  } = overrides;

  const employee =
    typeof employeeOverrides === "object" && employeeOverrides !== null
      ? {
          id: EMPLOYEE_ID,
          userId: "employee-user-id",
          companyEmail: "maria.santos@launchpad.ph",
          firstName: "Maria",
          lastName: "Santos",
          middleName: "Cruz",
          personalEmail: "maria.santos.personal@gmail.com",
          birthday: new Date("1998-03-14T00:00:00.000Z"),
          address: { address: "12 Mabini St, Quezon City, Metro Manila" },
          emergencyContact: { emergencyContactNumber: "Juan Santos - +63 917 123 4567" },
          jobTitle: "HR Coordinator",
          department: { name: "People Operations" },
          ...employeeOverrides,
        }
      : {
          id: EMPLOYEE_ID,
          userId: "employee-user-id",
          companyEmail: "maria.santos@launchpad.ph",
          firstName: "Maria",
          lastName: "Santos",
          middleName: "Cruz",
          personalEmail: "maria.santos.personal@gmail.com",
          birthday: new Date("1998-03-14T00:00:00.000Z"),
          address: { address: "12 Mabini St, Quezon City, Metro Manila" },
          emergencyContact: { emergencyContactNumber: "Juan Santos - +63 917 123 4567" },
          jobTitle: "HR Coordinator",
          department: { name: "People Operations" },
        };

  const template =
    typeof templateOverrides === "object" && templateOverrides !== null
      ? {
          id: TEMPLATE_ID,
          name: "Default",
          isDefault: true,
          documents: [buildDocumentRecord()],
          customFields: [buildCustomFieldRecord()],
          ...templateOverrides,
        }
      : {
          id: TEMPLATE_ID,
          name: "Default",
          isDefault: true,
          documents: [buildDocumentRecord()],
          customFields: [buildCustomFieldRecord()],
        };

  return {
    id: RECORD_ID,
    employeeId: EMPLOYEE_ID,
    templateId: TEMPLATE_ID,
    isComplete: false,
    completedAt: null,
    createdAt: new Date("2026-06-17T08:00:00.000Z"),
    updatedAt: new Date("2026-06-17T08:00:00.000Z"),
    employee,
    template,
    documentSubmissions: documentSubmissions ?? [buildSubmissionRecord()],
    customFieldValues:
      customFieldValues ??
      ([
        {
          id: "custom-field-value-id",
          recordId: RECORD_ID,
          fieldId: CUSTOM_FIELD_ID,
          value: "34-1234567-8",
          createdAt: new Date("2026-06-17T09:00:00.000Z"),
          updatedAt: new Date("2026-06-17T09:00:00.000Z"),
        },
      ] as Array<Record<string, unknown>>),
    ...recordOverrides,
  };
}
