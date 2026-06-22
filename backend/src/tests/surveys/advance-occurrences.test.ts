/**
 * Idempotency guarantee for the recurring-occurrence scheduler.
 *
 * `advanceDueOccurrences` runs from two triggers — the daily cron and the surveys read path.
 * These tests prove that running it materializes the current period exactly once: it creates a
 * new occurrence only when the previous period has elapsed, and is a strict no-op while the
 * current occurrence is still open. So the cron and the read path can both fire without ever
 * producing a duplicate occurrence.
 */
const mockResolveAudience = jest.fn();
const mockNotifyNewPulse = jest.fn();

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    pulseSurvey: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("../../modules/performance/surveys/rules/audience", () => ({
  resolveAudience: (...args: unknown[]) => mockResolveAudience(...args),
}));
jest.mock("../../modules/notifications/notifications.service", () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({ notifyNewPulse: mockNotifyNewPulse })),
}));

import { advanceDueOccurrences } from "../../modules/performance/surveys/occurrences/occurrence-scheduler";
import { prisma } from "../../core/database/prisma.service";

const findMany = prisma.pulseSurvey.findMany as jest.Mock;
const transaction = prisma.$transaction as jest.Mock;

/** A WEEKLY survey with a 2-day release->deadline window, whose latest occurrence is `latest`. */
const weeklySurvey = (latest: { occurrenceNumber: number; releaseDate: string }) => ({
  id: "survey-1",
  name: "Weekly Pulse",
  recurringType: "WEEKLY",
  audienceType: "EVERYONE",
  releaseDate: new Date("2026-06-16T09:00:00Z"),
  deadline: new Date("2026-06-18T09:00:00Z"),
  audienceConfigs: [],
  occurrences: [
    { id: `occ-${latest.occurrenceNumber}`, occurrenceNumber: latest.occurrenceNumber, releaseDate: new Date(latest.releaseDate) },
  ],
});

/** A tx whose ops record their calls; `create` returns a stable id. */
const makeTx = () => {
  const update = jest.fn().mockResolvedValue(undefined);
  const create = jest.fn().mockResolvedValue({ id: "new-occ" });
  const createMany = jest.fn().mockResolvedValue(undefined);
  return {
    tx: { surveyOccurrence: { update, create }, surveyAudienceMember: { createMany } },
    update,
    create,
    createMany,
  };
};

describe("advanceDueOccurrences", () => {
  beforeEach(() => {
    findMany.mockReset();
    transaction.mockReset();
    mockResolveAudience.mockReset();
    mockNotifyNewPulse.mockReset();
    mockResolveAudience.mockResolvedValue(["emp-1", "emp-2"]);
  });

  it("creates exactly one new occurrence when the previous period has elapsed", async () => {
    findMany.mockResolvedValue([weeklySurvey({ occurrenceNumber: 1, releaseDate: "2026-06-16T09:00:00Z" })]);
    const { tx, update, create, createMany } = makeTx();
    transaction.mockImplementation((cb: (t: unknown) => unknown) => cb(tx));

    // now is past the 06-23 weekly release, so occurrence #2 is due
    await advanceDueOccurrences(new Date("2026-06-24T09:00:00Z"));

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        surveyId: "survey-1",
        occurrenceNumber: 2,
        releaseDate: new Date("2026-06-23T09:00:00Z"),
        deadline: new Date("2026-06-25T09:00:00Z"), // release + the same 2-day window
        isClosed: false,
      },
    });
    expect(update).toHaveBeenCalledWith({ where: { id: "occ-1" }, data: { isClosed: true } }); // closes the elapsed one
    expect(createMany).toHaveBeenCalledTimes(1); // snapshots the freshly-resolved audience
    expect(mockNotifyNewPulse).toHaveBeenCalledTimes(1);
  });

  it("re-resolves the audience against live state at each release (new hires in, inactive out)", async () => {
    findMany.mockResolvedValue([weeklySurvey({ occurrenceNumber: 1, releaseDate: "2026-06-16T09:00:00Z" })]);
    mockResolveAudience.mockResolvedValue(["new-hire-A", "new-hire-B", "still-active-C"]);
    const { tx, createMany } = makeTx();
    transaction.mockImplementation((cb: (t: unknown) => unknown) => cb(tx));

    await advanceDueOccurrences(new Date("2026-06-24T09:00:00Z"));

    expect(mockResolveAudience).toHaveBeenCalledTimes(1); // resolved fresh, not reused from #1
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { occurrenceId: "new-occ", employeeId: "new-hire-A" },
        { occurrenceId: "new-occ", employeeId: "new-hire-B" },
        { occurrenceId: "new-occ", employeeId: "still-active-C" },
      ],
    });
  });

  it("is a strict no-op while the current occurrence is still open (no duplicate)", async () => {
    // latest is #2 (released 06-23); now is inside its open period — next release 06-30 not due
    findMany.mockResolvedValue([weeklySurvey({ occurrenceNumber: 2, releaseDate: "2026-06-23T09:00:00Z" })]);
    transaction.mockImplementation((cb: (t: unknown) => unknown) => cb(makeTx().tx));

    await advanceDueOccurrences(new Date("2026-06-24T09:00:00Z"));

    expect(transaction).not.toHaveBeenCalled(); // nothing created
    expect(mockNotifyNewPulse).not.toHaveBeenCalled();
  });

  it("creates only one occurrence across back-to-back runs (cron then read path)", async () => {
    const { tx, create } = makeTx();
    transaction.mockImplementation((cb: (t: unknown) => unknown) => cb(tx));

    // Run 1 (e.g. the cron): latest is #1, period elapsed → #2 gets created
    findMany.mockResolvedValueOnce([weeklySurvey({ occurrenceNumber: 1, releaseDate: "2026-06-16T09:00:00Z" })]);
    await advanceDueOccurrences(new Date("2026-06-24T09:00:00Z"));

    // Run 2 (e.g. the read path moments later): DB now has #2 as latest → nothing due
    findMany.mockResolvedValueOnce([weeklySurvey({ occurrenceNumber: 2, releaseDate: "2026-06-23T09:00:00Z" })]);
    await advanceDueOccurrences(new Date("2026-06-24T09:05:00Z"));

    expect(create).toHaveBeenCalledTimes(1); // exactly one occurrence, not two
  });
});
