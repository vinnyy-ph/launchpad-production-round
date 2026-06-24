import { openai, OPENAI_MODEL } from "../../../../core/openai.service";
import { prisma } from "../../../../core/database/prisma.service";
import { SURVEY_ERROR_MESSAGES, SURVEY_TEXT_LIMITS } from "../surveys.constants";
import { MIN_TEAM_SIZE } from "../rules/results";
import { ResultsRepository } from "./results.repository";
import { ResultsService } from "./results.service";
import type { QuestionResult } from "./results.types";

const MAX_SUGGESTIONS = 3;

export interface NoteSuggestionsResultDto {
  success: true;
  data: { suggestions: string[] };
}

/** LLM port — real impl calls OpenAI; tests inject a fake and assert call/no-call. */
export interface NoteSuggestionGeneratorPort {
  readonly model: string;
  generate(input: {
    surveyName: string;
    teamName: string;
    respondedCount: number;
    recipientCount: number;
    aggregate: string;
  }): Promise<string[]>;
}

function buildSystemPrompt(): string {
  return [
    "You are an HR partner drafting a short, tactful note to a team's SUPERVISOR about that team's",
    "ANONYMOUS pulse-survey results. The team is small (fewer than 3 people), so you must NEVER",
    "reveal, quote, or guess any individual's response — speak only in high-level, aggregate terms.",
    `Write exactly ${MAX_SUGGESTIONS} alternative notes the HR user can choose from, each a different style:`,
    "(1) a concise factual summary, (2) a warm and supportive tone, (3) an action-oriented suggestion.",
    "Each note is addressed to the supervisor, 2-4 sentences, under 600 characters, and must not",
    "include names or anything that could identify a single respondent.",
    'Return ONLY valid JSON, no prose, matching exactly: {"suggestions": [string, string, string]}',
  ].join("\n");
}

function buildUserContent(input: {
  surveyName: string;
  teamName: string;
  respondedCount: number;
  recipientCount: number;
  aggregate: string;
}): string {
  return [
    `Survey: ${input.surveyName}`,
    `Team: ${input.teamName}`,
    `Responses: ${input.respondedCount} of ${input.recipientCount} team members answered.`,
    "Aggregated results (no individual responses):",
    input.aggregate || "(no quantitative breakdown available)",
  ].join("\n");
}

function parseSuggestions(text: string): string[] {
  let arr: unknown = [];
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).suggestions)) {
      arr = (parsed as any).suggestions;
    }
  } catch {
    // fall through to empty
  }
  return (Array.isArray(arr) ? arr : [])
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s !== "")
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => s.slice(0, SURVEY_TEXT_LIMITS.SHARE_MESSAGE));
}

/** Real generator — calls OpenAI (reusing the shared client + model as AI Insights). */
export class OpenAiNoteSuggestionGenerator implements NoteSuggestionGeneratorPort {
  readonly model = OPENAI_MODEL;

  async generate(input: {
    surveyName: string;
    teamName: string;
    respondedCount: number;
    recipientCount: number;
    aggregate: string;
  }): Promise<string[]> {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserContent(input) },
      ],
    });
    return parseSuggestions(completion.choices[0]?.message?.content ?? "{}");
  }
}

/** Compact, identity-free aggregate string fed to the model. */
function buildAggregate(questions: QuestionResult[]): string {
  return questions
    .map((q, i) => {
      const n = `${q.responseCount} ${q.responseCount === 1 ? "response" : "responses"}`;
      if (q.type === "LINEAR_SCALE") {
        const dist = Object.entries(q.distribution)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ");
        return `Q${i + 1} (rating) "${q.questionText}": average ${q.average.toFixed(1)}, ${n}; distribution ${dist}`;
      }
      if (q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") {
        const counts = Object.entries(q.counts)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ");
        return `Q${i + 1} (choice) "${q.questionText}": ${counts} (${n})`;
      }
      return `Q${i + 1} (open text) "${q.questionText}": ${n} (individual text withheld for anonymity)`;
    })
    .join("\n");
}

/**
 * HR-only: suggest open-text notes to send to a small anonymous team's supervisor, drafted from
 * the team's AGGREGATE results (never raw individual responses). Same context gates as the share
 * (anonymous + small team + resolvable supervisor); completion is NOT required so HR can draft
 * before closing — the SEND action stays completion-gated. Reuses ResultsService for the HR-scoped
 * aggregate so anonymity/open-text suppression is applied identically.
 */
export class NoteSuggestionsService {
  constructor(
    private readonly repo = new ResultsRepository(),
    private readonly resultsService = new ResultsService(),
    private readonly generator: NoteSuggestionGeneratorPort = new OpenAiNoteSuggestionGenerator(),
  ) {}

  async suggest(args: {
    surveyId: string;
    occurrenceIdParam: string | null;
    teamId: string;
    userId: string;
    role: string;
  }): Promise<NoteSuggestionsResultDto> {
    const survey = await prisma.pulseSurvey.findFirst({
      where: { id: args.surveyId, deletedAt: null },
      select: { id: true, name: true, isAnonymous: true },
    });
    if (!survey) throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);
    if (!survey.isAnonymous) throw new Error(SURVEY_ERROR_MESSAGES.SHARE_NOT_ANONYMOUS);

    const occurrence = args.occurrenceIdParam
      ? await this.repo.findOccurrence(args.occurrenceIdParam)
      : await this.repo.findLatestOccurrence(survey.id);
    if (!occurrence || occurrence.surveyId !== survey.id) {
      throw new Error(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
    }

    const team = await this.repo.findTeamForShare(args.teamId);
    if (!team) throw new Error(SURVEY_ERROR_MESSAGES.TEAM_NOT_FOUND);
    if (team._count.members >= MIN_TEAM_SIZE) {
      throw new Error(SURVEY_ERROR_MESSAGES.SHARE_NOT_SMALL_TEAM);
    }
    if (!team.leaderId || !team.leader) {
      throw new Error(SURVEY_ERROR_MESSAGES.SHARE_NO_SUPERVISOR);
    }

    // HR-scoped aggregate for this team's round (reuses the aggregation + anonymity suppression).
    const results = await this.resultsService.getResults(
      survey.id,
      occurrence.id,
      args.userId,
      args.role,
      args.teamId,
      null,
    );

    let suggestions: string[];
    try {
      suggestions = await this.generator.generate({
        surveyName: survey.name,
        teamName: team.name,
        respondedCount: results.data.respondedCount,
        recipientCount: results.data.recipientCount,
        aggregate: buildAggregate(results.data.questions),
      });
    } catch {
      throw new Error(SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE);
    }

    if (suggestions.length === 0) {
      throw new Error(SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE);
    }

    return { success: true, data: { suggestions } };
  }
}
