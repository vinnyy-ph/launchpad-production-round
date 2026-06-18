import type { Role } from "@prisma/client";
import { prisma } from "../../core/database/prisma.service";

export const HR_USER_ID = "hr-user-id";
export const HR_EMPLOYEE_ID = "hr-employee-id";
export const HR_USER_ID_2 = "hr-user-id-2";
export const HR_EMPLOYEE_ID_2 = "hr-employee-id-2";
export const NOTIFICATION_ID = "notification-id";
export const COMPLETED_EMPLOYEE_ID = "completed-employee-id";

export const mockedPrisma = jest.mocked(prisma);
export const employeeFindUniqueMock = mockedPrisma.employee.findUnique as jest.Mock;
export const employeeFindManyMock = mockedPrisma.employee.findMany as jest.Mock;
export const notificationFindManyMock = mockedPrisma.notification.findMany as jest.Mock;
export const notificationFindFirstMock = mockedPrisma.notification.findFirst as jest.Mock;
export const notificationCreateMock = mockedPrisma.notification.create as jest.Mock;
export const notificationCreateManyMock = mockedPrisma.notification.createMany as jest.Mock;
export const notificationUpdateMock = mockedPrisma.notification.update as jest.Mock;

/** Clears notification Prisma mocks before each test. */
export function resetNotificationMocks() {
  employeeFindUniqueMock.mockReset();
  employeeFindManyMock.mockReset();
  notificationFindManyMock.mockReset();
  notificationFindFirstMock.mockReset();
  notificationCreateMock.mockReset();
  notificationCreateManyMock.mockReset();
  notificationUpdateMock.mockReset();
}

/** HR account injected by the auth mock. */
export function buildHrUser() {
  return {
    id: HR_USER_ID,
    email: "darbenlamonte@gmail.com",
    googleId: "google-hr-uid",
    role: "HR" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/** Builds a persisted notification row. */
export function buildNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTIFICATION_ID,
    recipientId: HR_EMPLOYEE_ID,
    type: "ONBOARDING_COMPLETE",
    channel: "IN_APP",
    subject: "Employee onboarding completed",
    body: "Maria Santos has completed onboarding and is now active.",
    linkUrl: `/employees/${COMPLETED_EMPLOYEE_ID}`,
    sourceType: "Employee",
    sourceId: COMPLETED_EMPLOYEE_ID,
    isRead: false,
    readAt: null,
    createdAt: new Date("2026-06-18T03:30:00.000Z"),
    updatedAt: new Date("2026-06-18T03:30:00.000Z"),
    ...overrides,
  };
}

/** HR employee records returned when notifying all HR users. */
export function buildHrEmployees() {
  return [
    { id: HR_EMPLOYEE_ID, userId: HR_USER_ID },
    { id: HR_EMPLOYEE_ID_2, userId: HR_USER_ID_2 },
  ];
}
