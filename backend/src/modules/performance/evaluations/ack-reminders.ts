import { prisma } from "../../../core/database/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";

const notificationsService = new NotificationsService();

/** Daily cadence for evaluation-acknowledgement reminders, anchored to issuance. */
const EVAL_ACK_REMINDER_INTERVAL_DAYS = 1;

/**
 * Lazy evaluation-acknowledgement reminder sweep — the on-read counterpart to the
 * deemed-ack settlement, run from the employee surface tick (not the supervisor list, so
 * that read stays a pure query). For every sent, still-pending evaluation whose ack window
 * is still open, it reminds the reviewee on a daily cadence (anchored to issuance) until
 * they acknowledge or the deadline passes (deemed-ack then settles on read).
 *
 * Reminders stop naturally: acknowledged, deemed-acknowledged, or past-deadline rows are
 * excluded by the query.
 */
export async function sweepEvalAckReminders(now: Date = new Date()): Promise<void> {
  const pending = await prisma.performanceEvaluation.findMany({
    where: {
      isSent: true,
      deletedAt: null,
      ackDeadline: { gt: now },
      acknowledgement: { is: { acknowledgedAt: null, isDeemedAck: false } },
    },
    select: { id: true, revieweeId: true, sentAt: true },
  });

  for (const evaluation of pending) {
    if (!evaluation.sentAt) continue;
    await notificationsService.remindEvalAckIfDue(
      evaluation.revieweeId,
      EVAL_ACK_REMINDER_INTERVAL_DAYS,
      evaluation.sentAt,
      evaluation.id,
      now,
    );
  }
}
