import "dotenv/config";
import { prisma } from "../core/database/prisma.service";
import { sweepPulseReminders } from "../modules/performance/surveys/reminders/reminders.service";

/**
 * Reminds every audience member with an open, still-pending pulse survey occurrence, on the
 * survey's configured cadence (until they respond or the deadline passes). Pure and testable —
 * `now` is injectable.
 */
export async function runSurveyReminderSweep(now: Date = new Date()): Promise<void> {
  await sweepPulseReminders(now);
}

/**
 * One-shot CLI entrypoint for the Railway cron service. Runs the sweep and exits (Railway
 * only re-triggers a cron run once the previous one has exited).
 */
async function main(): Promise<void> {
  try {
    await runSurveyReminderSweep();
    console.log("[survey-reminder] sweep complete");
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("[survey-reminder] sweep failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
