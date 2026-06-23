import { prisma } from "../../../../core/database/prisma.service";
import type { Prisma } from "@prisma/client";

export class ResultsRepository {
  async findSurveyWithConfigs(surveyId: string) {
    const includeOptions: Record<string, unknown> = {
      questions: { orderBy: { orderIndex: "asc" } },
      audienceConfigs: true,
      _count: { select: { occurrences: true } },
    };

    try {
      includeOptions.visibilityConfigs = true;
    } catch {
      // relation not available
    }

    const survey = await prisma.pulseSurvey.findFirst({
      where: { id: surveyId, deletedAt: null },
      include: includeOptions as any,
    });

    if (!survey) return null;

    const result = survey as any;
    if (!result.visibilityConfigs) {
      result.visibilityConfigs = [];
    }
    return result;
  }

  async findOccurrence(occurrenceId: string) {
    return prisma.surveyOccurrence.findUnique({
      where: { id: occurrenceId },
    });
  }

  /** The most recent occurrence (full row) for a survey, or null if never activated. */
  async findLatestOccurrence(surveyId: string) {
    return prisma.surveyOccurrence.findFirst({
      where: { surveyId },
      orderBy: { occurrenceNumber: "desc" },
    });
  }

  /** Team + leader (supervisor) + member count, for the small-team share gate and DTO hint. */
  async findTeamForShare(teamId: string) {
    return prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        leaderId: true,
        leader: { select: { id: true, firstName: true, lastName: true, status: true, userId: true } },
        _count: { select: { members: true } },
      },
    });
  }

  /** An existing HR share of one team's results for one occurrence (the supervisor's view-grant). */
  async findResultShare(occurrenceId: string, teamId: string) {
    return prisma.surveyResultShare.findUnique({
      where: { occurrenceId_teamId: { occurrenceId, teamId } },
    });
  }

  /** Idempotent upsert of a share — re-sending refreshes the actor + timestamp. */
  async upsertResultShare(input: {
    occurrenceId: string;
    teamId: string;
    supervisorId: string;
    sharedById: string;
  }) {
    return prisma.surveyResultShare.upsert({
      where: { occurrenceId_teamId: { occurrenceId: input.occurrenceId, teamId: input.teamId } },
      create: input,
      update: { supervisorId: input.supervisorId, sharedById: input.sharedById, sharedAt: new Date() },
    });
  }

  /** The most recent occurrence (highest occurrenceNumber) for a survey, or null if never activated. */
  async findLatestOccurrenceId(surveyId: string): Promise<string | null> {
    const occ = await prisma.surveyOccurrence.findFirst({
      where: { surveyId },
      orderBy: { occurrenceNumber: "desc" },
      select: { id: true },
    });
    return occ?.id ?? null;
  }

  async findResponsesWithAnswers(where: Prisma.SurveyResponseWhereInput) {
    return prisma.surveyResponse.findMany({
      where,
      include: {
        answers: true,
      },
    });
  }

  async findAudienceMembers(where: Prisma.SurveyAudienceMemberWhereInput) {
    return prisma.surveyAudienceMember.findMany({
      where,
      select: {
        employeeId: true,
      },
    });
  }

  /** Recipients across the matched occurrence(s) — the response-rate denominator. */
  async countAudienceMembers(where: Prisma.SurveyAudienceMemberWhereInput) {
    return prisma.surveyAudienceMember.count({ where });
  }

  /** Completed responses across the matched occurrence(s), ignoring scope filters. */
  async countResponses(where: Prisma.SurveyResponseWhereInput) {
    return prisma.surveyResponse.count({ where });
  }

  /** All activated (occurrence-bearing), non-deleted surveys with the config needed to gate viewing. */
  async findActivatedSurveysWithConfigs() {
    return prisma.pulseSurvey.findMany({
      where: { deletedAt: null, occurrences: { some: {} } },
      include: {
        audienceConfigs: true,
        visibilityConfigs: true,
        _count: { select: { occurrences: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Distinct survey ids (from the given set) that have an audience member among the given employees. */
  async findSurveyIdsWithAudienceMembers(
    surveyIds: string[],
    employeeIds: string[],
  ): Promise<string[]> {
    if (surveyIds.length === 0 || employeeIds.length === 0) return [];
    const rows = await prisma.surveyAudienceMember.findMany({
      where: {
        employeeId: { in: employeeIds },
        occurrence: { surveyId: { in: surveyIds } },
      },
      select: { occurrence: { select: { surveyId: true } } },
    });
    return [...new Set(rows.map((r) => r.occurrence.surveyId))];
  }
}
