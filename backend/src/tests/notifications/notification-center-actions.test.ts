import request from "supertest";
import { app } from "../../app";
import {
  buildHrUser,
  buildNotification,
  employeeFindUniqueMock,
  notificationFindFirstMock,
  notificationFindManyMock,
  notificationUpdateMock,
  notificationUpdateManyMock,
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
      updateMany: jest.fn(),
    },
    notificationPreference: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));

describe("Notification center actions", () => {
  beforeEach(() => {
    resetNotificationMocks();
    notificationUpdateManyMock.mockReset();
    employeeFindUniqueMock.mockResolvedValue({ id: "hr-employee-id" });
  });

  describe("GET /api/v1/notifications", () => {
    it("excludes archived rows and orders pinned-first", async () => {
      notificationFindManyMock.mockResolvedValue([]);

      await request(app).get("/api/v1/notifications").expect(200);

      expect(notificationFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientId: "hr-employee-id", deletedAt: null },
          orderBy: [
            { isPinned: "desc" },
            { pinnedAt: "desc" },
            { createdAt: "desc" },
          ],
        }),
      );
    });

    it("returns isPinned/pinnedAt on each row", async () => {
      notificationFindManyMock.mockResolvedValue([
        buildNotification({ isPinned: true, pinnedAt: new Date("2026-06-24T10:00:00.000Z") }),
      ]);

      const res = await request(app).get("/api/v1/notifications").expect(200);

      expect(res.body.data[0]).toMatchObject({
        isPinned: true,
        pinnedAt: "2026-06-24T10:00:00.000Z",
      });
    });
  });

  describe("PATCH /api/v1/notifications/read-all", () => {
    it("marks all unread as read and returns the count", async () => {
      notificationUpdateManyMock.mockResolvedValue({ count: 3 });

      const res = await request(app)
        .patch("/api/v1/notifications/read-all")
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        message: "All notifications marked as read",
        data: { count: 3 },
      });
      expect(notificationUpdateManyMock).toHaveBeenCalledWith({
        where: { recipientId: "hr-employee-id", isRead: false, deletedAt: null },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe("PATCH /api/v1/notifications/:id/pin", () => {
    it("pins a notification", async () => {
      notificationFindFirstMock.mockResolvedValue(buildNotification());
      notificationUpdateMock.mockResolvedValue(
        buildNotification({ isPinned: true, pinnedAt: new Date("2026-06-24T10:00:00.000Z") }),
      );

      const res = await request(app)
        .patch("/api/v1/notifications/notification-id/pin")
        .send({ pinned: true })
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        message: "Notification pinned",
        data: { isPinned: true },
      });
      expect(notificationUpdateMock).toHaveBeenCalledWith({
        where: { id: "notification-id" },
        data: { isPinned: true, pinnedAt: expect.any(Date) },
      });
    });

    it("unpins a notification (clears pinnedAt)", async () => {
      notificationFindFirstMock.mockResolvedValue(buildNotification({ isPinned: true }));
      notificationUpdateMock.mockResolvedValue(buildNotification({ isPinned: false }));

      const res = await request(app)
        .patch("/api/v1/notifications/notification-id/pin")
        .send({ pinned: false })
        .expect(200);

      expect(res.body).toMatchObject({ message: "Notification unpinned" });
      expect(notificationUpdateMock).toHaveBeenCalledWith({
        where: { id: "notification-id" },
        data: { isPinned: false, pinnedAt: null },
      });
    });

    it("returns 400 when pinned is missing", async () => {
      const res = await request(app)
        .patch("/api/v1/notifications/notification-id/pin")
        .send({})
        .expect(400);

      expect(res.body).toMatchObject({ success: false, errorCode: "VALIDATION_FAILED" });
    });

    it("returns 404 when the notification is not owned/found", async () => {
      notificationFindFirstMock.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/v1/notifications/missing/pin")
        .send({ pinned: true })
        .expect(404);

      expect(res.body).toMatchObject({ errorCode: "NOTIFICATION_NOT_FOUND" });
    });
  });

  describe("DELETE /api/v1/notifications/:id", () => {
    it("soft-deletes (clears) one notification", async () => {
      notificationFindFirstMock.mockResolvedValue(buildNotification());
      notificationUpdateMock.mockResolvedValue(
        buildNotification({ deletedAt: new Date("2026-06-24T11:00:00.000Z") }),
      );

      const res = await request(app)
        .delete("/api/v1/notifications/notification-id")
        .expect(200);

      expect(res.body).toMatchObject({ success: true, message: "Notification cleared" });
      expect(notificationUpdateMock).toHaveBeenCalledWith({
        where: { id: "notification-id" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("returns 404 when the notification is not owned/found", async () => {
      notificationFindFirstMock.mockResolvedValue(null);

      await request(app).delete("/api/v1/notifications/missing").expect(404);
    });
  });

  describe("DELETE /api/v1/notifications", () => {
    it("clears all notifications except pinned ones", async () => {
      notificationUpdateManyMock.mockResolvedValue({ count: 5 });

      const res = await request(app).delete("/api/v1/notifications").expect(200);

      expect(res.body).toMatchObject({
        success: true,
        message: "Notifications cleared",
        data: { count: 5 },
      });
      expect(notificationUpdateManyMock).toHaveBeenCalledWith({
        where: { recipientId: "hr-employee-id", deletedAt: null, isPinned: false },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
