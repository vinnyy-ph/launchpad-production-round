import "dotenv/config";
import { prisma } from "../core/database/prisma.service";
import { sweepEvalAckReminders } from "../modules/performance/evaluations/ack-reminders";

/**
 * Reminds every reviewee with a sent, still-pending evaluation (on the daily cadence, until
 * they acknowledge or the deadline passes). Pure and testable — `now` is injectable.
 */
export async function runEvalAckReminderSweep(now: Date = new Date()): Promise<void> {
  await sweepEvalAckReminders(now);
}

/**
 * One-shot CLI entrypoint for the Railway cron service. Runs the sweep and exits (Railway
 * only re-triggers a cron run once the previous one has exited).
 */
async function main(): Promise<void> {
  try {
    await runEvalAckReminderSweep();
    console.log("[eval-ack-reminder] sweep complete");
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("[eval-ack-reminder] sweep failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
