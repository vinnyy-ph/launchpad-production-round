import request from "supertest";
import { app } from "../../app";
import {
  buildHrUser,
  buildNotification,
  employeeFindUniqueMock,
  notificationFindFirstMock,
  notificationUpdateMock,
  resetNotificationMocks,
} from "./notifications-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

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

describe("PATCH /api/v1/notifications/:notificationId/read", () => {
  beforeEach(() => {
    resetNotificationMocks();
  });

  it("returns 200 and marks the notification as read", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "hr-employee-id" });
    notificationFindFirstMock.mockResolvedValue(buildNotification());
    notificationUpdateMock.mockResolvedValue(
      buildNotification({ isRead: true, readAt: new Date("2026-06-18T04:00:00.000Z") }),
    );

    const response = await request(app)
      .patch("/api/v1/notifications/notification-id/read")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Notification marked as read",
      data: {
        id: "notification-id",
        isRead: true,
      },
    });
  });

  it("returns 404 when the notification is not found", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "hr-employee-id" });
    notificationFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/notifications/missing-notification-id/read")
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "NOTIFICATION_NOT_FOUND",
    });
  });
});
