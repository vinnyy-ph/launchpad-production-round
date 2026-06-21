const mockRemind = jest.fn();

jest.mock("../../core/database/prisma.service", () => ({
  prisma: { performanceEvaluation: { findMany: jest.fn() } },
}));

jest.mock("../../modules/notifications/notifications.service", () => ({
  NotificationsService: jest.fn(() => ({ remindEvalAckIfDue: mockRemind })),
}));

import { prisma } from "../../core/database/prisma.service";
import { sweepEvalAckReminders } from "../../modules/performance/evaluations/ack-reminders";

const findManyMock = prisma.performanceEvaluation.findMany as jest.Mock;

describe("sweepEvalAckReminders (lazy/cron eval-ack reminder sweep)", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    mockRemind.mockReset();
  });

  it("reminds each pending reviewee on the daily cadence, anchored to sentAt", async () => {
    const sentAt = new Date("2026-06-10T00:00:00.000Z");
    findManyMock.mockResolvedValue([{ id: "eval-1", revieweeId: "ree-1", sentAt }]);
    const now = new Date("2026-06-21T00:00:00.000Z");

    await sweepEvalAckReminders(now);

    expect(mockRemind).toHaveBeenCalledTimes(1);
    expect(mockRemind).toHaveBeenCalledWith("ree-1", 1, sentAt, "eval-1", now);
  });

  it("queries only sent, non-deleted, deadline-open, still-pending evaluations", async () => {
    findManyMock.mockResolvedValue([]);
    const now = new Date("2026-06-21T00:00:00.000Z");

    await sweepEvalAckReminders(now);

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        isSent: true,
        deletedAt: null,
        ackDeadline: { gt: now },
        acknowledgement: { is: { acknowledgedAt: null, isDeemedAck: false } },
      },
      select: { id: true, revieweeId: true, sentAt: true },
    });
  });

  it("skips an evaluation with no sentAt", async () => {
    findManyMock.mockResolvedValue([{ id: "eval-1", revieweeId: "ree-1", sentAt: null }]);

    await sweepEvalAckReminders(new Date());

    expect(mockRemind).not.toHaveBeenCalled();
  });
});
