import { emitToUser } from "../../core/socket/socket.service";
import { NotificationsService } from "../../modules/notifications/notifications.service";
import {
  buildHrEmployees,
  buildNotification,
  employeeFindManyMock,
  notificationCreateMock,
  resetNotificationMocks,
} from "./notifications-test.helpers";

jest.mock("../../core/database/prisma.service", () => ({
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

jest.mock("../../core/socket/socket.service", () => ({
  emitToUser: jest.fn(),
}));

const emitToUserMock = jest.mocked(emitToUser);

describe("NotificationsService.notifyHrOnboardingComplete", () => {
  beforeEach(() => {
    resetNotificationMocks();
    emitToUserMock.mockReset();
  });

  it("creates a notification for each HR employee and emits a socket event", async () => {
    employeeFindManyMock.mockResolvedValue(buildHrEmployees());
    notificationCreateMock
      .mockResolvedValueOnce(buildNotification({ id: "notification-1", recipientId: "hr-employee-id" }))
      .mockResolvedValueOnce(
        buildNotification({ id: "notification-2", recipientId: "hr-employee-id-2" }),
      );

    const service = new NotificationsService();
    await service.notifyHrOnboardingComplete("Maria Santos", "completed-employee-id");

    expect(notificationCreateMock).toHaveBeenCalledTimes(2);
    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: "hr-employee-id",
          type: "ONBOARDING_COMPLETE",
          subject: "Employee onboarding completed",
          body: "Maria Santos has completed onboarding and is now active.",
          linkUrl: "/employees/completed-employee-id",
          sourceType: "Employee",
          sourceId: "completed-employee-id",
        }),
      }),
    );

    expect(emitToUserMock).toHaveBeenCalledTimes(2);
    expect(emitToUserMock).toHaveBeenCalledWith(
      "hr-user-id",
      "notification",
      expect.objectContaining({
        type: "ONBOARDING_COMPLETE",
        subject: "Employee onboarding completed",
      }),
    );
    expect(emitToUserMock).toHaveBeenCalledWith(
      "hr-user-id-2",
      "notification",
      expect.objectContaining({
        type: "ONBOARDING_COMPLETE",
      }),
    );
  });

  it("does nothing when no HR employees exist", async () => {
    employeeFindManyMock.mockResolvedValue([]);

    const service = new NotificationsService();
    await service.notifyHrOnboardingComplete("Maria Santos", "completed-employee-id");

    expect(notificationCreateMock).not.toHaveBeenCalled();
    expect(emitToUserMock).not.toHaveBeenCalled();
  });
});
