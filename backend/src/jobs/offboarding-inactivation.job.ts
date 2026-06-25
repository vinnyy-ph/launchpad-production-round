import "dotenv/config";
import { prisma } from "../core/database/prisma.service";
import { ClearanceService } from "../modules/people/offboarding/clearance/clearance.service";

/**
 * Inactivates employees whose offboarding clearance is complete and whose effective date
 * has arrived but who are still ACTIVE (their signatures all landed before the effective
 * date). Pure and testable — `now` is injectable; returns the number inactivated.
 */
export async function runOffboardingInactivationSweep(
  now: Date = new Date(),
): Promise<number> {
  const clearanceService = new ClearanceService();
  return clearanceService.inactivateDueOffboardings(now);
}

/**
 * One-shot CLI entrypoint for the Railway cron service. Runs the sweep, logs the count, and
 * exits (Railway only re-triggers a cron run once the previous one has exited).
 */
async function main(): Promise<void> {
  try {
    const inactivated = await runOffboardingInactivationSweep();
    console.log(`[offboarding-inactivation] inactivated ${inactivated} employee(s)`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("[offboarding-inactivation] sweep failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
