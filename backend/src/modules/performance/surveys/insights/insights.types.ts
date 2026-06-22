import type { Prisma } from "@prisma/client";

export type InsightSentiment = "positive" | "neutral" | "negative" | "mixed";

/** The synthesized summary returned to the client. `quotes` is always [] for anonymous surveys. */
export interface RawInsight {
  oneLiner: string;
  sentiment: { overall: InsightSentiment; rationale: string };
  themes: { label: string; description: string }[];
  quotes: string[];
}

/** Survey config the service needs to gate and scope, pre-flattened. */
export interface InsightSurveyInfo {
  id: string;
  name: string;
  isAnonymous: boolean;
  visibility: string;
  audienceConfigTeamIds: string[];
  visibilityConfigTeamIds: string[];
  openTextQuestions: { id: string; questionText: string }[];
}

export interface InsightCaller {
  id: string;
  supervisorId: string | null;
  teamIds: string[];
}

/** The viewer's entitled data boundary (non-HR). Mirrors results.service's callerScope. */
export type CallerScope =
  | { kind: "supervisor"; ids: string[] }
  | { kind: "team"; teamIds: string[] };

/** One response's open-text answers (identity-free — only question + text). */
export interface InsightResponse {
  answers: { questionId: string; answerText: string | null }[];
}

export interface CachedInsight {
  payload: RawInsight;
  responseCount: number;
  model: string;
  generatedAt: Date;
}

/** Data-access port — kept Prisma-free so the service is testable with a fake. */
export interface InsightsRepositoryPort {
  findSurveyForInsights(surveyId: string): Promise<InsightSurveyInfo | null>;
  findCaller(userId: string): Promise<InsightCaller | null>;
  downwardChain(employeeId: string): Promise<string[]>;
  findAudienceEmployeeIds(surveyId: string): Promise<string[]>;
  findOpenTextResponses(surveyId: string, scope: CallerScope | null): Promise<InsightResponse[]>;
  getCachedInsight(surveyId: string, scopeKey: string): Promise<CachedInsight | null>;
  upsertCachedInsight(args: {
    surveyId: string;
    scopeKey: string;
    payload: RawInsight;
    responseCount: number;
    model: string;
  }): Promise<void>;
}

/** LLM port — real impl calls OpenAI; tests inject a fake and assert call/no-call. */
export interface InsightGeneratorPort {
  readonly model: string;
  generate(input: {
    questions: { questionText: string; answers: string[] }[];
    allowQuotes: boolean;
  }): Promise<RawInsight>;
}

/** Service result (pre-serialization). */
export interface InsightResult {
  surveyId: string;
  available: boolean;
  reason?: "no_open_text" | "no_responses";
  suppressed: boolean;
  isAnonymous: boolean;
  responseCount: number;
  model: string | null;
  generatedAt: Date | null;
  cached: boolean;
  insight?: RawInsight;
}

/** Wire DTO. */
export interface SurveyInsightResponseDto {
  success: true;
  data: Omit<InsightResult, "generatedAt"> & { generatedAt: string | null };
}

// Re-export for the repository's where-builder.
export type ResponseWhere = Prisma.SurveyResponseWhereInput;
