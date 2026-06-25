import type { Role } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";

export const RECORD_ID = "onboarding-record-id";
export const INVITATION_ID = "invitation-id";
export const EMPLOYEE_ID = "employee-id";
export const USER_ID = "user-id";

export const mockedPrisma = jest.mocked(prisma);
export const onboardingRecordFindFirstMock =
  mockedPrisma.onboardingRecord.findFirst as jest.Mock;
export const onboardingInvitationFindManyMock =
  mockedPrisma.onboardingInvitation.findMany as jest.Mock;
export const onboardingInvitationFindFirstMock =
  mockedPrisma.onboardingInvitation.findFirst as jest.Mock;
export const onboardingInvitationCreateMock =
  mockedPrisma.onboardingInvitation.create as jest.Mock;
export const onboardingInvitationUpdateMock =
  mockedPrisma.onboardingInvitation.update as jest.Mock;
export const onboardingInvitationResendAttemptCountMock =
  mockedPrisma.onboardingInvitationResendAttempt.count as jest.Mock;
export const onboardingInvitationResendAttemptCreateMock =
  mockedPrisma.onboardingInvitationResendAttempt.create as jest.Mock;
export const transactionMock = mockedPrisma.$transaction as jest.Mock;

/** Clears invitation-related Prisma mocks before each test. */
export function resetInvitationMocks() {
  onboardingRecordFindFirstMock.mockReset();
  onboardingInvitationFindManyMock.mockReset();
  onboardingInvitationFindFirstMock.mockReset();
  onboardingInvitationCreateMock.mockReset();
  onboardingInvitationUpdateMock.mockReset();
  onboardingInvitationResendAttemptCountMock.mockReset();
  onboardingInvitationResendAttemptCreateMock.mockReset();
  transactionMock.mockReset();

  onboardingInvitationResendAttemptCountMock.mockResolvedValue(0);
  onboardingInvitationResendAttemptCreateMock.mockResolvedValue({
    id: "resend-attempt-id",
    invitationId: INVITATION_ID,
    attemptedAt: new Date("2026-06-17T08:02:00.000Z"),
    createdAt: new Date("2026-06-17T08:02:00.000Z"),
    updatedAt: new Date("2026-06-17T08:02:00.000Z"),
  });
}

/** Minimal HR account injected by the auth mock. */
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

/** Regular employee account for authorization tests. */
export function buildEmployeeUser() {
  return {
    id: "employee-user-id",
    email: "employee@launchpad.ph",
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
    email: "admin@launchpad.ph",
    googleId: null,
    role: "ADMIN" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

export function buildInvitationRecord(overrides: Record<string, unknown> = {}) {
  const sentAt = new Date(Date.now() - 61_000);
  const expiresAt = new Date(sentAt.getTime() + 24 * 60 * 60 * 1000);

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

export function buildOnboardingRecord(overrides: Record<string, unknown> = {}) {
  const { employee: employeeOverrides, invitations, ...recordOverrides } =
    overrides;

  const employee =
    typeof employeeOverrides === "object" && employeeOverrides !== null
      ? {
          id: EMPLOYEE_ID,
          userId: USER_ID,
          companyEmail: "maria.santos@launchpad.ph",
          firstName: "Maria",
          lastName: "Santos",
          user: {
            id: USER_ID,
            email: "maria.santos@launchpad.ph",
            googleId: null,
          },
          ...employeeOverrides,
        }
      : {
          id: EMPLOYEE_ID,
          userId: USER_ID,
          companyEmail: "maria.santos@launchpad.ph",
          firstName: "Maria",
          lastName: "Santos",
          user: {
            id: USER_ID,
            email: "maria.santos@launchpad.ph",
            googleId: null,
          },
        };

  return {
    id: RECORD_ID,
    employeeId: EMPLOYEE_ID,
    templateId: "template-id",
    isComplete: false,
    completedAt: null,
    createdAt: new Date("2026-06-17T08:00:00.000Z"),
    updatedAt: new Date("2026-06-17T08:00:00.000Z"),
    employee,
    invitations:
      invitations ??
      ([buildInvitationRecord()] as ReturnType<typeof buildInvitationRecord>[]),
    ...recordOverrides,
  };
}

export function buildInvitationWithRecord(overrides: Record<string, unknown> = {}) {
  const { record: recordOverrides, ...invitationOverrides } = overrides;
  const invitation = buildInvitationRecord(invitationOverrides);

  return {
    ...invitation,
    record: buildOnboardingRecord(
      typeof recordOverrides === "object" && recordOverrides !== null
        ? (recordOverrides as Record<string, unknown>)
        : {},
    ),
  };
}

export function buildUpdateEmailBody() {
  return {
    email: "maria.santos.corrected@launchpad.ph",
  };
}

/** Wires invitation update mocks for successful email delivery. */
export function mockSuccessfulInvitationUpdate(
  invitationOverrides: Record<string, unknown> = {},
) {
  const invitation = buildInvitationRecord(invitationOverrides);

  onboardingInvitationUpdateMock.mockResolvedValue(invitation);

  return invitation;
}
