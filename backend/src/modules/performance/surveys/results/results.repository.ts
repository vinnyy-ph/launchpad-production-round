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
}
