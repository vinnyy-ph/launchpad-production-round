import type { Role } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";

export const RECORD_ID = "onboarding-record-id";
export const EMPLOYEE_ID = "employee-id";
export const USER_ID = "employee-user-id";
export const TEMPLATE_ID = "template-id";
export const DOCUMENT_ID = "document-id";
export const CUSTOM_FIELD_ID = "custom-field-id";
export const INVITATION_ID = "invitation-id";
export const SUBMISSION_ID = "submission-id";

export const mockedPrisma = jest.mocked(prisma);
export const onboardingRecordFindFirstMock =
  mockedPrisma.onboardingRecord.findFirst as jest.Mock;
export const onboardingInvitationFindFirstMock =
  mockedPrisma.onboardingInvitation.findFirst as jest.Mock;
export const onboardingInvitationUpdateMock =
  mockedPrisma.onboardingInvitation.update as jest.Mock;
export const employeeFindManyMock = mockedPrisma.employee.findMany as jest.Mock;
export const employeeUpdateMock = mockedPrisma.employee.update as jest.Mock;
export const onboardingDocumentFindFirstMock =
  mockedPrisma.onboardingDocument.findFirst as jest.Mock;
export const onboardingDocumentSubmissionFindFirstMock =
  mockedPrisma.onboardingDocumentSubmission.findFirst as jest.Mock;
export const onboardingDocumentSubmissionCreateMock =
  mockedPrisma.onboardingDocumentSubmission.create as jest.Mock;
export const onboardingCustomFieldFindManyMock =
  mockedPrisma.onboardingCustomField.findMany as jest.Mock;
export const onboardingCustomFieldValueUpsertMock =
  mockedPrisma.onboardingCustomFieldValue.upsert as jest.Mock;
export const onboardingRecordUpdateMock =
  mockedPrisma.onboardingRecord.update as jest.Mock;
export const transactionMock = mockedPrisma.$transaction as jest.Mock;

/** Clears employee onboarding Prisma mocks before each test. */
export function resetEmployeeOnboardingMocks() {
  onboardingRecordFindFirstMock.mockReset();
  onboardingInvitationFindFirstMock.mockReset();
  onboardingInvitationUpdateMock.mockReset();
  employeeFindManyMock.mockReset();
  employeeUpdateMock.mockReset();
  onboardingDocumentFindFirstMock.mockReset();
  onboardingDocumentSubmissionFindFirstMock.mockReset();
  onboardingDocumentSubmissionCreateMock.mockReset();
  onboardingCustomFieldFindManyMock.mockReset();
  onboardingCustomFieldValueUpsertMock.mockReset();
  onboardingRecordUpdateMock.mockReset();
  transactionMock.mockReset();

  employeeFindManyMock.mockResolvedValue([]);
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

/** Employee account injected by the auth mock. */
export function buildEmployeeUser() {
  return {
    id: USER_ID,
    email: "maria.santos@launchpad.ph",
    googleId: "google-uid",
    role: "EMPLOYEE" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/** HR account for authorization tests. */
export function buildHrUser() {
  return {
    id: "hr-user-id",
    email: "hr@launchpad.ph",
    googleId: null,
    role: "HR" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

export function buildInvitationRecord(overrides: Record<string, unknown> = {}) {
  const sentAt = new Date("2026-06-17T08:00:00.000Z");
  const expiresAt = new Date("2026-07-17T08:00:00.000Z");

  return {
    id: INVITATION_ID,
    recordId: RECORD_ID,
    sentToEmail: "maria.santos@launchpad.ph",
    status: "PENDING",
    sentAt,
    expiresAt,
    createdAt: sentAt,
    updatedAt: sentAt,
    ...overrides,
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
    fileUrl: "https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance.pdf",
    status: "PENDING",
    rejectionNote: null,
    reviewerId: null,
    submittedAt: new Date("2026-06-17T10:00:00.000Z"),
    reviewedAt: null,
    createdAt: new Date("2026-06-17T10:00:00.000Z"),
    updatedAt: new Date("2026-06-17T10:00:00.000Z"),
    document: { id: DOCUMENT_ID, documentName: "NBI Clearance" },
    ...overrides,
  };
}

export function buildOnboardingRecord(overrides: Record<string, unknown> = {}) {
  const {
    employee: employeeOverrides,
    template: templateOverrides,
    invitations,
    documentSubmissions,
    customFieldValues,
    ...recordOverrides
  } = overrides;

  const employee =
    typeof employeeOverrides === "object" && employeeOverrides !== null
      ? {
          id: EMPLOYEE_ID,
          userId: USER_ID,
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
          userId: USER_ID,
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
    invitations:
      invitations ??
      ([buildInvitationRecord()] as ReturnType<typeof buildInvitationRecord>[]),
    documentSubmissions: documentSubmissions ?? [],
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

export function buildUpdateProfileBody() {
  return {
    firstName: "Maria",
    lastName: "Santos",
    middleName: "Cruz",
    personalEmail: "maria.santos.personal@gmail.com",
    birthday: "1998-03-14",
    address: "12 Mabini St, Quezon City, Metro Manila",
    emergencyContact: "Juan Santos - 09171234567",
  };
}

export function buildSubmitCustomFieldsBody() {
  return {
    fields: [
      {
        fieldId: CUSTOM_FIELD_ID,
        value: "34-1234567-8",
      },
    ],
  };
}

export function buildSubmitDocumentBody() {
  return {
    fileUrl: "https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance.pdf",
  };
}
