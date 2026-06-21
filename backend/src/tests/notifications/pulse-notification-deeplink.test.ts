import { emitToUser } from "../../core/socket/socket.service";
import { NotificationsService } from "../../modules/notifications/notifications.service";
import {
  buildNotification,
  employeeFindManyMock,
  employeeFindUniqueMock,
  notificationCreateMock,
  notificationFindFirstMock,
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

const SURVEY_ID = "survey-123";
const OCCURRENCE_ID = "occurrence-456";

describe("pulse notifications deep-link to the exact occurrence", () => {
  beforeEach(() => {
    resetNotificationMocks();
    emitToUserMock.mockReset();
  });

  it("notifyNewPulse stamps linkUrl with the occurrence id (so the bell opens the exact pulse)", async () => {
    employeeFindManyMock.mockResolvedValue([{ id: "emp-1", userId: "user-1" }]);
    notificationCreateMock.mockResolvedValue(buildNotification({ type: "NEW_PULSE" }));

    const service = new NotificationsService();
    await service.notifyNewPulse(["emp-1"], SURVEY_ID, "Q3 Pulse", OCCURRENCE_ID);

    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "NEW_PULSE",
          linkUrl: `/surveys/${OCCURRENCE_ID}`,
          // Ledger key stays the survey so reminder dedup is unaffected.
          sourceId: SURVEY_ID,
        }),
      }),
    );
  });

  it("remindPulseIfDue stamps linkUrl with the occurrence id", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1", userId: "user-1" });
    notificationFindFirstMock.mockResolvedValue(null); // no prior reminder → fires now
    notificationCreateMock.mockResolvedValue(buildNotification({ type: "PULSE_REMINDER" }));

    const service = new NotificationsService();
    await service.remindPulseIfDue(
      "emp-1",
      1,
      new Date("2026-06-01T00:00:00.000Z"),
      SURVEY_ID,
      "Q3 Pulse",
      new Date("2026-06-10T00:00:00.000Z"),
      OCCURRENCE_ID,
    );

    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PULSE_REMINDER",
          linkUrl: `/surveys/${OCCURRENCE_ID}`,
          sourceId: SURVEY_ID,
        }),
      }),
    );
  });
});
