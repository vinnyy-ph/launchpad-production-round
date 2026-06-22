import { prisma } from "../../../../core/database/prisma.service";
import { createOrgChains } from "../../../shared/org/chains";
import { ResultsRepository } from "../results/results.repository";
import type {
  CallerScope,
  CachedInsight,
  InsightCaller,
  InsightResponse,
  InsightSurveyInfo,
  InsightsRepositoryPort,
  RawInsight,
  ResponseWhere,
} from "./insights.types";

export class InsightsRepository implements InsightsRepositoryPort {
  constructor(private readonly results = new ResultsRepository()) {}

  async findSurveyForInsights(surveyId: string): Promise<InsightSurveyInfo | null> {
    const survey = (await this.results.findSurveyWithConfigs(surveyId)) as any;
    if (!survey) return null;
    return {
      id: survey.id,
      name: survey.name,
      isAnonymous: survey.isAnonymous,
      visibility: survey.visibility,
      audienceConfigTeamIds: (survey.audienceConfigs ?? [])
        .map((c: any) => c.teamId)
        .filter((id: any): id is string => !!id),
      visibilityConfigTeamIds: (survey.visibilityConfigs ?? []).map((vc: any) => vc.teamId),
      openTextQuestions: (survey.questions ?? [])
        .filter((q: any) => q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER")
        .map((q: any) => ({ id: q.id, questionText: q.questionText })),
    };
  }

  async findCaller(userId: string): Promise<InsightCaller | null> {
    const caller = await prisma.employee.findUnique({
      where: { userId },
      include: { teamMemberships: true },
    });
    if (!caller) return null;
    return {
      id: caller.id,
      supervisorId: caller.supervisorId,
      teamIds: caller.teamMemberships.map((m) => m.teamId),
    };
  }

  async downwardChain(employeeId: string): Promise<string[]> {
    return createOrgChains(prisma).downwardChain(employeeId);
  }

  async findAudienceEmployeeIds(surveyId: string): Promise<string[]> {
    const members = await this.results.findAudienceMembers({ occurrence: { surveyId } });
    return members.map((m) => m.employeeId);
  }

  async findOpenTextResponses(
    surveyId: string,
    scope: CallerScope | null,
  ): Promise<InsightResponse[]> {
    const where: ResponseWhere = { occurrence: { surveyId } };
    if (scope?.kind === "supervisor") {
      where.respondentSupervisorId = { in: scope.ids };
    } else if (scope?.kind === "team") {
      where.respondentTeamIds = { hasSome: scope.teamIds };
    }
    const rows = await this.results.findResponsesWithAnswers(where);
    return rows.map((r) => ({
      answers: r.answers.map((a) => ({ questionId: a.questionId, answerText: a.answerText })),
    }));
  }

  async getCachedInsight(surveyId: string, scopeKey: string): Promise<CachedInsight | null> {
    const row = await prisma.surveyInsight.findUnique({
      where: { surveyId_scopeKey: { surveyId, scopeKey } },
    });
    if (!row) return null;
    return {
      payload: row.payload as unknown as RawInsight,
      responseCount: row.responseCount,
      model: row.model,
      generatedAt: row.generatedAt,
    };
  }

  async upsertCachedInsight(args: {
    surveyId: string;
    scopeKey: string;
    payload: RawInsight;
    responseCount: number;
    model: string;
  }): Promise<void> {
    await prisma.surveyInsight.upsert({
      where: { surveyId_scopeKey: { surveyId: args.surveyId, scopeKey: args.scopeKey } },
      create: {
        surveyId: args.surveyId,
        scopeKey: args.scopeKey,
        payload: args.payload as unknown as object,
        responseCount: args.responseCount,
        model: args.model,
      },
      update: {
        payload: args.payload as unknown as object,
        responseCount: args.responseCount,
        model: args.model,
        generatedAt: new Date(),
      },
    });
  }
}
