import { emitToUser } from "../../../core/socket/socket.service";
import { NotificationsService } from "../../../modules/notifications/notifications.service";
import {
  buildNotification,
  employeeFindUniqueMock,
  notificationCreateMock,
  resetNotificationMocks,
} from "../../notifications/notifications-test.helpers";

jest.mock("../../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn(), findMany: jest.fn() },
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("../../../core/socket/socket.service", () => ({
  emitToUser: jest.fn(),
}));

const emitToUserMock = jest.mocked(emitToUser);

const SUPERVISOR_EMPLOYEE_ID = "supervisor-employee-id";
const SUPERVISOR_USER_ID = "supervisor-user-id";
const NEW_EMPLOYEE_ID = "new-employee-id";

describe("NotificationsService supervisor onboarding alerts", () => {
  beforeEach(() => {
    resetNotificationMocks();
    emitToUserMock.mockReset();
  });

  it("notifies the supervisor when a subordinate starts onboarding", async () => {
    employeeFindUniqueMock.mockResolvedValue({
      id: SUPERVISOR_EMPLOYEE_ID,
      userId: SUPERVISOR_USER_ID,
    });

    notificationCreateMock.mockResolvedValue(
      buildNotification({
        id: "supervisor-start-notification",
        recipientId: SUPERVISOR_EMPLOYEE_ID,
        type: "ONBOARDING_STATUS",
        subject: "Direct report started onboarding",
        body: "Maria Santos has started onboarding.",
        linkUrl: `/employees/${NEW_EMPLOYEE_ID}`,
        sourceType: "Employee",
        sourceId: NEW_EMPLOYEE_ID,
      }),
    );

    const service = new NotificationsService();
    await service.notifySupervisorOnboardingStarted(
      "Maria Santos",
      NEW_EMPLOYEE_ID,
      SUPERVISOR_EMPLOYEE_ID,
    );

    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: SUPERVISOR_EMPLOYEE_ID,
          type: "ONBOARDING_STATUS",
          subject: "Direct report started onboarding",
          body: "Maria Santos has started onboarding.",
          linkUrl: `/employees/${NEW_EMPLOYEE_ID}`,
        }),
      }),
    );

    expect(emitToUserMock).toHaveBeenCalledWith(
      SUPERVISOR_USER_ID,
      "notification",
      expect.objectContaining({
        type: "ONBOARDING_STATUS",
        subject: "Direct report started onboarding",
      }),
    );
  });

  it("notifies the supervisor when a subordinate completes onboarding", async () => {
    employeeFindUniqueMock.mockResolvedValue({
      id: SUPERVISOR_EMPLOYEE_ID,
      userId: SUPERVISOR_USER_ID,
    });

    notificationCreateMock.mockResolvedValue(
      buildNotification({
        id: "supervisor-complete-notification",
        recipientId: SUPERVISOR_EMPLOYEE_ID,
        type: "ONBOARDING_COMPLETE",
        subject: "Direct report completed onboarding",
        body: "Maria Santos has completed onboarding and is now active.",
        linkUrl: `/employees/${NEW_EMPLOYEE_ID}`,
      }),
    );

    const service = new NotificationsService();
    await service.notifySupervisorOnboardingComplete(
      "Maria Santos",
      NEW_EMPLOYEE_ID,
      SUPERVISOR_EMPLOYEE_ID,
    );

    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: SUPERVISOR_EMPLOYEE_ID,
          type: "ONBOARDING_COMPLETE",
          subject: "Direct report completed onboarding",
          body: "Maria Santos has completed onboarding and is now active.",
        }),
      }),
    );

    expect(emitToUserMock).toHaveBeenCalledWith(
      SUPERVISOR_USER_ID,
      "notification",
      expect.objectContaining({
        type: "ONBOARDING_COMPLETE",
      }),
    );
  });

  it("does nothing when the supervisor is not found", async () => {
    employeeFindUniqueMock.mockResolvedValue(null);

    const service = new NotificationsService();
    await service.notifySupervisorOnboardingStarted(
      "Maria Santos",
      NEW_EMPLOYEE_ID,
      "missing-supervisor-id",
    );

    expect(notificationCreateMock).not.toHaveBeenCalled();
    expect(emitToUserMock).not.toHaveBeenCalled();
  });

  it("does not throw when notification delivery fails", async () => {
    employeeFindUniqueMock.mockRejectedValue(new Error("Database unavailable"));

    const service = new NotificationsService();

    await expect(
      service.notifySupervisorOnboardingComplete(
        "Maria Santos",
        NEW_EMPLOYEE_ID,
        SUPERVISOR_EMPLOYEE_ID,
      ),
    ).resolves.toBeUndefined();
  });
});
