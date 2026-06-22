jest.mock("../../core/database/prisma.service", () => ({ prisma: {} }));
jest.mock("../../jobs/deemed-ack.job", () => ({ runDeemedAckSweep: jest.fn() }));
jest.mock("../../jobs/eval-ack-reminder.job", () => ({ runEvalAckReminderSweep: jest.fn() }));
jest.mock("../../jobs/survey-reminder.job", () => ({ runSurveyReminderSweep: jest.fn() }));

import { runDailyCron } from "../../jobs/cron-daily";
import { runDeemedAckSweep } from "../../jobs/deemed-ack.job";
import { runEvalAckReminderSweep } from "../../jobs/eval-ack-reminder.job";
import { runSurveyReminderSweep } from "../../jobs/survey-reminder.job";

const deemedAck = runDeemedAckSweep as jest.Mock;
const evalReminder = runEvalAckReminderSweep as jest.Mock;
const surveyReminder = runSurveyReminderSweep as jest.Mock;

describe("runDailyCron", () => {
  beforeEach(() => {
    deemedAck.mockReset();
    evalReminder.mockReset();
    surveyReminder.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns false when every job succeeds", async () => {
    deemedAck.mockResolvedValue(0);
    evalReminder.mockResolvedValue(undefined);
    surveyReminder.mockResolvedValue(undefined);

    expect(await runDailyCron()).toBe(false);
    expect(surveyReminder).toHaveBeenCalledTimes(1);
  });

  it("runs the remaining jobs even when one throws, and reports failure", async () => {
    deemedAck.mockRejectedValue(new Error("boom"));
    evalReminder.mockResolvedValue(undefined);
    surveyReminder.mockResolvedValue(undefined);

    const failed = await runDailyCron();

    expect(failed).toBe(true);
    expect(deemedAck).toHaveBeenCalledTimes(1);
    expect(evalReminder).toHaveBeenCalledTimes(1); // not skipped by the earlier failure
    expect(surveyReminder).toHaveBeenCalledTimes(1); // not skipped by the earlier failure
  });
});
