import "dotenv/config";
import { prisma } from "../core/database/prisma.service";
import { EvaluationsService } from "../modules/performance/evaluations/evaluations.service";

/**
 * Settles overdue evaluation acknowledgements to deemed-acknowledged. Pure and testable —
 * `now` is injectable; returns the number flipped.
 */
export async function runDeemedAckSweep(now: Date = new Date()): Promise<number> {
  const evaluationsService = new EvaluationsService();
  return evaluationsService.settleAllDeemedAck(now);
}

/**
 * One-shot CLI entrypoint for the Railway cron service. Runs the sweep, logs the count, and
 * exits (Railway only re-triggers a cron run once the previous one has exited).
 */
async function main(): Promise<void> {
  try {
    const flipped = await runDeemedAckSweep();
    console.log(`[deemed-ack] settled ${flipped} evaluation(s)`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("[deemed-ack] sweep failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
