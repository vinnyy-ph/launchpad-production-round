import { emitToUser } from "../../core/socket/socket.service";
import { NotificationsService } from "../../modules/notifications/notifications.service";
import {
  buildNotification,
  employeeFindManyMock,
  employeeFindUniqueMock,
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

describe("NotificationsService.notifyOffboardingStarted", () => {
  beforeEach(() => {
    resetNotificationMocks();
    emitToUserMock.mockReset();
  });

  it("notifies the offboarded employee and links to their offboarding progress view", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "employee-id", userId: "user-id" });
    notificationCreateMock.mockResolvedValue(
      buildNotification({
        recipientId: "employee-id",
        type: "OFFBOARDING_STARTED",
        linkUrl: "/offboarding",
      }),
    );

    const service = new NotificationsService();
    await service.notifyOffboardingStarted("employee-id", "offboarding-id");

    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: "employee-id",
          type: "OFFBOARDING_STARTED",
          subject: "Your offboarding has started",
          linkUrl: "/offboarding",
          sourceType: "OffboardingRecord",
          sourceId: "offboarding-id",
        }),
      }),
    );
    expect(emitToUserMock).toHaveBeenCalledWith(
      "user-id",
      "notification",
      expect.objectContaining({
        type: "OFFBOARDING_STARTED",
        linkUrl: "/offboarding",
      }),
    );
  });

  it("notifies supervisors in the hierarchy and links to hierarchy status", async () => {
    employeeFindManyMock.mockResolvedValue([
      { id: "supervisor-1", userId: "supervisor-user-1" },
      { id: "supervisor-2", userId: "supervisor-user-2" },
    ]);
    notificationCreateMock
      .mockResolvedValueOnce(
        buildNotification({
          id: "notification-1",
          recipientId: "supervisor-1",
          type: "OFFBOARDING_STATUS",
          linkUrl: "/supervisor/status",
        }),
      )
      .mockResolvedValueOnce(
        buildNotification({
          id: "notification-2",
          recipientId: "supervisor-2",
          type: "OFFBOARDING_STATUS",
          linkUrl: "/supervisor/status",
        }),
      );

    const service = new NotificationsService();
    await service.notifySupervisorOffboardingStarted(
      ["supervisor-1", "supervisor-2"],
      "Blake Rivera",
      "offboarding-id",
    );

    expect(notificationCreateMock).toHaveBeenCalledTimes(2);
    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: "supervisor-1",
          type: "OFFBOARDING_STATUS",
          subject: "Employee in your hierarchy is offboarding",
          linkUrl: "/supervisor/status",
          sourceType: "OffboardingRecord",
          sourceId: "offboarding-id",
        }),
      }),
    );
    expect(emitToUserMock).toHaveBeenCalledWith(
      "supervisor-user-1",
      "notification",
      expect.objectContaining({
        type: "OFFBOARDING_STATUS",
        linkUrl: "/supervisor/status",
      }),
    );
    expect(emitToUserMock).toHaveBeenCalledWith(
      "supervisor-user-2",
      "notification",
      expect.objectContaining({
        type: "OFFBOARDING_STATUS",
        linkUrl: "/supervisor/status",
      }),
    );
  });
});
