import "dotenv/config";
import { prisma } from "../core/database/prisma.service";
import { advanceDueOccurrences } from "../modules/performance/surveys/occurrences/occurrence-scheduler";
import { runDeemedAckSweep } from "./deemed-ack.job";
import { runEvalAckReminderSweep } from "./eval-ack-reminder.job";
import { runOffboardingInactivationSweep } from "./offboarding-inactivation.job";
import { runSurveyReminderSweep } from "./survey-reminder.job";

/** Every daily-cadence sweep, run from a single cron. Add new daily jobs as one line each. */
const DAILY_JOBS: ReadonlyArray<{ name: string; run: () => Promise<unknown> }> = [
  { name: "deemed-ack", run: () => runDeemedAckSweep() },
  { name: "eval-ack-reminder", run: () => runEvalAckReminderSweep() },
  // Materialize due recurring occurrences before reminders, so the sweep acts on the
  // current occurrence even when no one has loaded the surveys page (the on-read path).
  { name: "advance-occurrences", run: () => advanceDueOccurrences() },
  { name: "survey-reminder", run: () => runSurveyReminderSweep() },
  // Inactivate offboarded employees once their effective date arrives (all signed earlier).
  { name: "offboarding-inactivation", run: () => runOffboardingInactivationSweep() },
];

/**
 * Runs each daily job in sequence, isolating failures so one job throwing never skips the
 * rest. Returns true if any job failed. Pure and testable — no process exit / disconnect.
 */
export async function runDailyCron(): Promise<boolean> {
  let failed = false;
  for (const job of DAILY_JOBS) {
    try {
      await job.run();
      console.log(`[cron-daily] ${job.name} ok`);
    } catch (error) {
      failed = true;
      console.error(`[cron-daily] ${job.name} failed:`, error);
    }
  }
  return failed;
}

/**
 * One-shot CLI entrypoint for the cron service. Exits non-zero if any job failed so the
 * platform surfaces it (Railway/Render only re-trigger once the previous run has exited).
 */
async function main(): Promise<void> {
  const failed = await runDailyCron();
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

if (require.main === module) {
  void main();
}
