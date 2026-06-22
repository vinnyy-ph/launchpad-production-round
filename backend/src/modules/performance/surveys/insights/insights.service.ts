import { MIN_GROUP } from "../rules/results";
import {
  canViewSurveyResults,
  type ResultsViewerContext,
  type SurveyVisibilityInfo,
} from "../rules/results-visibility";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import type {
  CallerScope,
  InsightGeneratorPort,
  InsightResult,
  InsightsRepositoryPort,
} from "./insights.types";

const HR_ROLES = new Set(["HR", "ADMIN"]);

export class InsightsService {
  constructor(
    private readonly repo: InsightsRepositoryPort,
    private readonly generator: InsightGeneratorPort,
  ) {}

  async generateInsights(args: {
    surveyId: string;
    userId: string;
    role: string;
    refresh?: boolean;
  }): Promise<InsightResult> {
    const survey = await this.repo.findSurveyForInsights(args.surveyId);
    if (!survey) throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);

    const isHR = HR_ROLES.has(args.role);
    const base = {
      surveyId: survey.id,
      isAnonymous: survey.isAnonymous,
      model: null,
      generatedAt: null,
      cached: false,
    } as const;

    // --- Access gate + scope (non-HR). Reuses the shared pure predicate. ---
    let callerScope: CallerScope | null = null;
    let scopeKey = "ALL";

    if (!isHR) {
      const caller = await this.repo.findCaller(args.userId);
      if (!caller) throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
      scopeKey = caller.id;

      let downward: string[] = [];
      let overlap = false;
      if (survey.visibility === "SUPERVISOR_BASED") {
        downward = await this.repo.downwardChain(caller.id);
        const audience = await this.repo.findAudienceEmployeeIds(survey.id);
        overlap = audience.some((id) => downward.includes(id));
      }

      const ctx: ResultsViewerContext = {
        isHR: false,
        caller: { supervisorId: caller.supervisorId, teamIds: caller.teamIds },
      };
      const info: SurveyVisibilityInfo = {
        visibility: survey.visibility,
        audienceConfigTeamIds: survey.audienceConfigTeamIds,
        visibilityConfigTeamIds: survey.visibilityConfigTeamIds,
      };
      if (!canViewSurveyResults(ctx, info, overlap)) {
        throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
      }

      // Data boundary (survey-level, no drill-down filter).
      if (survey.visibility === "SUPERVISOR_BASED") {
        callerScope = { kind: "supervisor", ids: [caller.id, ...downward] };
      } else if (survey.visibility === "TEAM_BASED") {
        callerScope = { kind: "team", teamIds: caller.teamIds };
      } else if (survey.visibility === "SPECIFIC_TEAMS") {
        callerScope = {
          kind: "team",
          teamIds: caller.teamIds.filter((id) => survey.visibilityConfigTeamIds.includes(id)),
        };
      }
      // EVERYONE / HR_ROOT_ONLY → null (entitled to the whole audience).
    }

    // --- No open-text questions at all. ---
    if (survey.openTextQuestions.length === 0) {
      return { ...base, available: false, reason: "no_open_text", suppressed: false, responseCount: 0 };
    }

    // --- Collect open-text answers, scoped. ---
    const responses = await this.repo.findOpenTextResponses(survey.id, callerScope);
    const openTextQIds = new Set(survey.openTextQuestions.map((q) => q.id));
    const hasText = (t: string | null | undefined): t is string =>
      typeof t === "string" && t.trim() !== "";

    const responseCount = responses.filter((r) =>
      r.answers.some((a) => openTextQIds.has(a.questionId) && hasText(a.answerText)),
    ).length;

    if (responseCount === 0) {
      return { ...base, available: false, reason: "no_responses", suppressed: false, responseCount: 0 };
    }

    // --- Min-group-size firewall (anonymous only), BEFORE any LLM spend. ---
    if (survey.isAnonymous && responseCount < MIN_GROUP) {
      return { ...base, available: true, suppressed: true, responseCount };
    }

    // --- Cache check. ---
    if (!args.refresh) {
      const cached = await this.repo.getCachedInsight(survey.id, scopeKey);
      if (cached && cached.responseCount === responseCount) {
        const insight = survey.isAnonymous ? { ...cached.payload, quotes: [] } : cached.payload;
        return {
          ...base,
          available: true,
          suppressed: false,
          responseCount,
          model: cached.model,
          generatedAt: cached.generatedAt,
          cached: true,
          insight,
        };
      }
    }

    // --- Generate. ---
    const questions = survey.openTextQuestions.map((q) => ({
      questionText: q.questionText,
      answers: responses
        .map((r) => r.answers.find((a) => a.questionId === q.id)?.answerText)
        .filter(hasText),
    }));

    const raw = await this.generator.generate({ questions, allowQuotes: !survey.isAnonymous });

    // Anonymity hard guard — defense in depth over the prompt instruction.
    if (survey.isAnonymous) raw.quotes = [];

    await this.repo.upsertCachedInsight({
      surveyId: survey.id,
      scopeKey,
      payload: raw,
      responseCount,
      model: this.generator.model,
    });

    return {
      ...base,
      available: true,
      suppressed: false,
      responseCount,
      model: this.generator.model,
      generatedAt: new Date(),
      cached: false,
      insight: raw,
    };
  }
}
