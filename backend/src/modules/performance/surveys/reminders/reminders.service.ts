import { prisma } from "../../../../core/database/prisma.service";
import { ACTIVE_EMPLOYEE } from "../../../shared";
import { NotificationsService } from "../../../notifications/notifications.service";
import type { ReminderFrequency } from "../rules/reminder-validation";

const notificationsService = new NotificationsService();

/** Maps a reminder cadence to the throttle interval in whole days. */
function intervalDaysFor(
  frequency: ReminderFrequency,
  everyXDays: number | null,
): number {
  switch (frequency) {
    case "WEEKLY":
      return 7;
    case "EVERY_X_DAYS":
      return everyXDays && everyXDays > 0 ? everyXDays : 1;
    case "DAILY":
    default:
      return 1;
  }
}

/**
 * Lazy pulse-reminder sweep — the on-read counterpart to `advanceDueOccurrences`, so
 * reminders fire without a background daemon. For every active survey that has a reminder
 * cadence and an open occurrence, it notifies still-active audience members who have not
 * completed it, throttled to the configured cadence by `remindPulseIfDue`.
 *
 * Reminders naturally STOP when they should: a closed or past-deadline occurrence is
 * excluded (so they stop at the deadline / on deactivation), and anyone with a
 * SurveyCompletion is excluded (so they stop once the employee submits).
 */
export async function sweepPulseReminders(now: Date = new Date()): Promise<void> {
  const surveys = await prisma.pulseSurvey.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      reminderConfig: { isNot: null },
    },
    select: {
      id: true,
      name: true,
      reminderConfig: { select: { frequency: true, everyXDays: true } },
      occurrences: {
        where: { isClosed: false, releaseDate: { lte: now }, deadline: { gt: now } },
        select: {
          id: true,
          releaseDate: true,
          audienceMembers: { select: { employeeId: true } },
          completions: { select: { employeeId: true } },
        },
      },
    },
  });

  for (const survey of surveys) {
    if (!survey.reminderConfig) continue;
    const interval = intervalDaysFor(
      survey.reminderConfig.frequency,
      survey.reminderConfig.everyXDays,
    );

    for (const occurrence of survey.occurrences) {
      const completed = new Set(occurrence.completions.map((c) => c.employeeId));
      const pendingIds = occurrence.audienceMembers
        .map((m) => m.employeeId)
        .filter((id) => !completed.has(id));
      if (pendingIds.length === 0) continue;

      // The audience was snapshotted when the occurrence opened; re-filter so a member who
      // has since gone inactive or been deactivated is no longer reminded (rule 5).
      const active = await prisma.employee.findMany({
        where: { id: { in: pendingIds }, ...ACTIVE_EMPLOYEE },
        select: { id: true },
      });

      for (const employee of active) {
        await notificationsService.remindPulseIfDue(
          employee.id,
          interval,
          occurrence.releaseDate,
          survey.id,
          survey.name,
          now,
          occurrence.id,
        );
      }
    }
  }
}
