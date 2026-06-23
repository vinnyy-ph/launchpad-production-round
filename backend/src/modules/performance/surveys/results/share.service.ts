import { prisma } from "../../../../core/database/prisma.service";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { MIN_TEAM_SIZE } from "../rules/results";
import { NotificationsService } from "../../../notifications/notifications.service";
import { ResultsRepository } from "./results.repository";

export interface ShareResultsResultDto {
  success: true;
  data: {
    sharedAt: string;
    supervisorId: string;
    supervisorName: string | null;
    teamName: string;
  };
}

/**
 * HR action: deliberately share a small (sub-MIN_TEAM_SIZE) anonymous team's pulse results
 * with that team's supervisor. The supervisor is otherwise blocked from the breakdown by the
 * anonymity / min-group-size firewall; this is a narrow, HR-initiated, completion-gated
 * exception. Every gate is enforced HERE (server-side), not in the UI.
 */
export class ShareService {
  constructor(
    private readonly repo = new ResultsRepository(),
    private readonly notificationsService = new NotificationsService(),
  ) {}

  async shareSmallTeamResults(
    surveyId: string,
    occurrenceIdParam: string | null,
    teamId: string,
    userId: string,
  ): Promise<ShareResultsResultDto> {
    // The HR actor (route is HR-gated; we still resolve their employee row to record sharedBy).
    const actor = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!actor) {
      throw new Error(SURVEY_ERROR_MESSAGES.SHARE_ACTOR_NOT_EMPLOYEE);
    }

    const survey = await prisma.pulseSurvey.findFirst({
      where: { id: surveyId, deletedAt: null },
      select: { id: true, name: true, isAnonymous: true },
    });
    if (!survey) {
      throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);
    }
    // The exception only exists because anonymity hides the breakdown; non-anonymous results
    // are already visible to the supervisor through normal scope, so there is nothing to share.
    if (!survey.isAnonymous) {
      throw new Error(SURVEY_ERROR_MESSAGES.SHARE_NOT_ANONYMOUS);
    }

    // Resolve the occurrence (explicit round, else the latest) and confirm it belongs to the survey.
    const occurrence = occurrenceIdParam
      ? await this.repo.findOccurrence(occurrenceIdParam)
      : await this.repo.findLatestOccurrence(survey.id);
    if (!occurrence || occurrence.surveyId !== survey.id) {
      throw new Error(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
    }

    // Completion gate — never share while the occurrence is still collecting responses.
    const completed =
      occurrence.isClosed || new Date(occurrence.deadline).getTime() < Date.now();
    if (!completed) {
      throw new Error(SURVEY_ERROR_MESSAGES.SHARE_NOT_COMPLETED);
    }

    const team = await this.repo.findTeamForShare(teamId);
    if (!team) {
      throw new Error(SURVEY_ERROR_MESSAGES.TEAM_NOT_FOUND);
    }
    if (team._count.members >= MIN_TEAM_SIZE) {
      throw new Error(SURVEY_ERROR_MESSAGES.SHARE_NOT_SMALL_TEAM);
    }
    // Recipient is resolved from the org graph (the team's leader) — never free choice.
    if (!team.leaderId || !team.leader) {
      throw new Error(SURVEY_ERROR_MESSAGES.SHARE_NO_SUPERVISOR);
    }

    const share = await this.repo.upsertResultShare({
      occurrenceId: occurrence.id,
      teamId: team.id,
      supervisorId: team.leaderId,
      sharedById: actor.id,
    });

    const supervisorName =
      [team.leader.firstName, team.leader.lastName].filter(Boolean).join(" ").trim() || null;

    // In-app + email notification with a deep link to the (now-granted) team-scoped results.
    // Fire-and-forget inside the service: a delivery failure must not fail the share itself.
    await this.notificationsService.notifySupervisorPulseResultsShared(
      team.leaderId,
      survey.name,
      team.name,
      survey.id,
      occurrence.id,
      team.id,
    );

    return {
      success: true,
      data: {
        sharedAt: share.sharedAt.toISOString(),
        supervisorId: team.leaderId,
        supervisorName,
        teamName: team.name,
      },
    };
  }
}
