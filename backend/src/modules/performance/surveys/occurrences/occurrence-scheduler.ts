import { prisma } from "../../../../core/database/prisma.service";
import { NotificationsService } from "../../../notifications/notifications.service";
import { resolveAudience } from "../rules/audience";
import { planCatchUpOccurrences, scheduleOffsetMs, type Cadence } from "../rules/recurrence";
import { buildAudienceDb, toAudienceSpec } from "../surveys.audience";

const notificationsService = new NotificationsService();

/**
 * Lazy recurrence — the "on-read scheduler". For every ACTIVE, non-ONE_TIME survey whose
 * latest occurrence's period has fully elapsed, this closes that occurrence and materializes
 * the current-period occurrence with a freshly-resolved audience snapshot (new hires in,
 * inactive/deactivated out — same resolver as activation).
 *
 * Called on hot read paths instead of a background daemon; idempotent and self-limiting
 * (nothing is created while the current occurrence is still open). Deactivated surveys
 * (isActive=false) are excluded by the query, so deactivation "stops all future occurrences"
 * (PER-09). ONE_TIME surveys never get a second occurrence.
 */
export async function advanceDueOccurrences(now: Date = new Date()): Promise<void> {
  const surveys = await prisma.pulseSurvey.findMany({
    where: { isActive: true, deletedAt: null, recurringType: { not: "ONE_TIME" } },
    include: {
      audienceConfigs: true,
      occurrences: { orderBy: { occurrenceNumber: "desc" }, take: 1 },
    },
  });

  for (const survey of surveys) {
    const latest = survey.occurrences[0];
    if (!latest) continue; // never activated — no occurrence to roll forward

    const offsetMs = scheduleOffsetMs(survey.releaseDate, survey.deadline);
    const plans = planCatchUpOccurrences(
      { occurrenceNumber: latest.occurrenceNumber, releaseDate: latest.releaseDate },
      survey.recurringType as Cadence,
      offsetMs,
      now,
    );
    if (plans.length === 0) continue; // current occurrence still open — nothing due

    // Only the current period is materialized open; the elapsed occurrence is closed.
    const current = plans[plans.length - 1];
    const spec = toAudienceSpec(
      survey.audienceType,
      survey.audienceConfigs.map((c) => ({
        supervisorId: c.supervisorId ?? undefined,
        teamId: c.teamId ?? undefined,
      })),
    );
    const audienceIds = await resolveAudience(spec, buildAudienceDb());

    const occurrenceId = await prisma.$transaction(async (tx) => {
      await tx.surveyOccurrence.update({ where: { id: latest.id }, data: { isClosed: true } });
      const occurrence = await tx.surveyOccurrence.create({
        data: {
          surveyId: survey.id,
          occurrenceNumber: current.occurrenceNumber,
          releaseDate: current.releaseDate,
          deadline: current.deadline,
          isClosed: false,
        },
      });
      if (audienceIds.length > 0) {
        await tx.surveyAudienceMember.createMany({
          data: audienceIds.map((employeeId) => ({ occurrenceId: occurrence.id, employeeId })),
        });
      }
      return occurrence.id;
    });

    // A newly-opened recurring occurrence notifies its audience, same as first activation.
    await notificationsService.notifyNewPulse(audienceIds, survey.id, survey.name, occurrenceId);
  }
}
