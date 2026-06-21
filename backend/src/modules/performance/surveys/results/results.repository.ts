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
