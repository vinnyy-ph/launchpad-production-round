import { prisma } from "../../core/database/prisma.service";
import { EvaluationsService } from "../../modules/performance/evaluations/evaluations.service";
import { EvaluationsRepository } from "../../modules/performance/evaluations/evaluations.repository";

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    evaluationAcknowledgement: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const ackFindManyMock = (prisma.evaluationAcknowledgement.findMany as jest.Mock);
const ackUpdateManyMock = (prisma.evaluationAcknowledgement.updateMany as jest.Mock);

function buildService(notify: jest.Mock) {
  const notificationsService = { notifyEvalDeemedAck: notify } as unknown as never;
  return new EvaluationsService(new EvaluationsRepository(), notificationsService);
}

describe("EvaluationsService.settleAllDeemedAck (scheduled deemed-ack sweep)", () => {
  beforeEach(() => {
    ackFindManyMock.mockReset();
    ackUpdateManyMock.mockReset();
  });

  it("flips every due acknowledgement and notifies each reviewer + reviewee", async () => {
    ackFindManyMock.mockResolvedValue([
      { evaluationId: "eval-1", evaluation: { reviewerId: "rev-1", revieweeId: "ree-1" } },
      { evaluationId: "eval-2", evaluation: { reviewerId: "rev-2", revieweeId: "ree-2" } },
    ]);
    ackUpdateManyMock.mockResolvedValue({ count: 2 });
    const notify = jest.fn().mockResolvedValue(undefined);

    const flipped = await buildService(notify).settleAllDeemedAck(new Date());

    expect(flipped).toBe(2);
    expect(ackUpdateManyMock).toHaveBeenCalledWith({
      where: { evaluationId: { in: ["eval-1", "eval-2"] } },
      data: { isDeemedAck: true },
    });
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith("rev-1", "ree-1", "eval-1");
    expect(notify).toHaveBeenCalledWith("rev-2", "ree-2", "eval-2");
  });

  it("queries only sent, non-deleted, past-deadline, still-pending acknowledgements", async () => {
    ackFindManyMock.mockResolvedValue([]);
    const now = new Date("2026-06-21T00:00:00.000Z");

    const flipped = await buildService(jest.fn()).settleAllDeemedAck(now);

    expect(flipped).toBe(0);
    expect(ackFindManyMock).toHaveBeenCalledWith({
      where: {
        acknowledgedAt: null,
        isDeemedAck: false,
        evaluation: { is: { isSent: true, deletedAt: null, ackDeadline: { lt: now } } },
      },
      select: {
        evaluationId: true,
        evaluation: { select: { reviewerId: true, revieweeId: true } },
      },
    });
  });

  it("does nothing (no update, no notify) when nothing is due", async () => {
    ackFindManyMock.mockResolvedValue([]);
    const notify = jest.fn();

    const flipped = await buildService(notify).settleAllDeemedAck(new Date());

    expect(flipped).toBe(0);
    expect(ackUpdateManyMock).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
