jest.mock("../../core/database/prisma.service", () => ({ prisma: {} }));

import { NotificationsService } from "../../modules/notifications/notifications.service";

const DAY_MS = 24 * 60 * 60 * 1000;
const recipient = {
  id: "ree-1",
  userId: "user-1",
  companyEmail: "reviewee@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
};

function buildService(last: { createdAt: Date } | null) {
  const repository = {
    findEmployeeWithUserById: jest.fn().mockResolvedValue(recipient),
    findLatestReminder: jest.fn().mockResolvedValue(last),
    create: jest.fn().mockResolvedValue({
      id: "notif-1",
      type: "EVAL_ACK_REMINDER",
      subject: "Action required: acknowledge your evaluation",
      body: "...",
      linkUrl: "/evaluations/eval-1",
      isRead: false,
      createdAt: new Date("2026-06-21T00:00:00.000Z"),
    }),
  };
  const inAppChannel = { deliver: jest.fn() };
  const emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
  const service = new NotificationsService(
    repository as never,
    inAppChannel as never,
    emailService as never,
  );
  return { service, repository, inAppChannel, emailService };
}

describe("NotificationsService.remindEvalAckIfDue (email + in-app)", () => {
  it("creates an in-app reminder AND sends an email when the cadence is due", async () => {
    const anchor = new Date("2026-06-19T00:00:00.000Z");
    const now = new Date("2026-06-21T00:00:00.000Z");
    const { service, repository, inAppChannel, emailService } = buildService(null);

    await service.remindEvalAckIfDue("ree-1", 1, anchor, "eval-1", now);

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(inAppChannel.deliver).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "reviewee@example.com",
        subject: "Reminder: acknowledge your evaluation",
        html: expect.stringContaining("Ada Lovelace"),
      }),
    );
  });

  it("sends neither in-app nor email when within the throttle window", async () => {
    const anchor = new Date("2026-06-19T00:00:00.000Z");
    const now = new Date("2026-06-21T00:00:00.000Z");
    // Last reminder was a few hours ago — under the 1-day interval.
    const last = { createdAt: new Date(now.getTime() - DAY_MS / 2) };
    const { service, repository, inAppChannel, emailService } = buildService(last);

    await service.remindEvalAckIfDue("ree-1", 1, anchor, "eval-1", now);

    expect(repository.create).not.toHaveBeenCalled();
    expect(inAppChannel.deliver).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
});
