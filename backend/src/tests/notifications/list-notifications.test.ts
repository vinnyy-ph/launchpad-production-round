import request from "supertest";
import { app } from "../../app";
import {
  buildHrUser,
  buildNotification,
  employeeFindUniqueMock,
  notificationFindManyMock,
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

describe("GET /api/v1/notifications", () => {
  beforeEach(() => {
    resetNotificationMocks();
  });

  it("returns 200 with notifications for the authenticated user", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "hr-employee-id" });
    notificationFindManyMock.mockResolvedValue([buildNotification()]);

    const response = await request(app)
      .get("/api/v1/notifications?limit=10")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Notifications retrieved successfully",
      data: [
        {
          id: "notification-id",
          type: "ONBOARDING_COMPLETE",
          subject: "Employee onboarding completed",
          body: "Maria Santos has completed onboarding and is now active.",
          isRead: false,
        },
      ],
    });
  });

  it("returns an empty array when no notifications exist", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "hr-employee-id" });
    notificationFindManyMock.mockResolvedValue([]);

    const response = await request(app)
      .get("/api/v1/notifications")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: [],
    });
  });

  it("returns 400 when limit is invalid", async () => {
    const response = await request(app)
      .get("/api/v1/notifications?limit=abc")
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
    });
  });

  it("returns 404 when the user has no employee profile", async () => {
    employeeFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/v1/notifications")
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "EMPLOYEE_PROFILE_NOT_FOUND",
    });
  });
});
