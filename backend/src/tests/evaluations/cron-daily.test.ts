jest.mock("../../core/database/prisma.service", () => ({ prisma: {} }));
jest.mock("../../jobs/deemed-ack.job", () => ({ runDeemedAckSweep: jest.fn() }));
jest.mock("../../jobs/eval-ack-reminder.job", () => ({ runEvalAckReminderSweep: jest.fn() }));

import { runDailyCron } from "../../jobs/cron-daily";
import { runDeemedAckSweep } from "../../jobs/deemed-ack.job";
import { runEvalAckReminderSweep } from "../../jobs/eval-ack-reminder.job";

const deemedAck = runDeemedAckSweep as jest.Mock;
const evalReminder = runEvalAckReminderSweep as jest.Mock;

describe("runDailyCron", () => {
  beforeEach(() => {
    deemedAck.mockReset();
    evalReminder.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns false when every job succeeds", async () => {
    deemedAck.mockResolvedValue(0);
    evalReminder.mockResolvedValue(undefined);

    expect(await runDailyCron()).toBe(false);
  });

  it("runs the remaining jobs even when one throws, and reports failure", async () => {
    deemedAck.mockRejectedValue(new Error("boom"));
    evalReminder.mockResolvedValue(undefined);

    const failed = await runDailyCron();

    expect(failed).toBe(true);
    expect(deemedAck).toHaveBeenCalledTimes(1);
    expect(evalReminder).toHaveBeenCalledTimes(1); // not skipped by the earlier failure
  });
});
