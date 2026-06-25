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

/** Identity-free context the model drafts from. Never carries raw individual responses. */
export interface NoteSuggestionInput {
  surveyName: string;
  teamName: string;
  respondedCount: number;
  recipientCount: number;
  aggregate: string;
  isAnonymous: boolean;
  belowMinGroup: boolean;
}

/** LLM port — real impl calls OpenAI; tests inject a fake and assert call/no-call. */
export interface NoteSuggestionGeneratorPort {
  readonly model: string;
  generate(input: NoteSuggestionInput): Promise<string[]>;
}

// Per PM/QA (SYS-005 board): the supervisor reads HR's plain note, so the suggestions must be
// factual, calm, third-person about the team, never identifying, and sentence-cased. The output
// envelope stays {"suggestions": [...]} (json_object response_format) rather than the board's
// "bare JSON array" so the parser contract is unchanged.
function buildSystemPrompt(): string {
  return [
    "You are a helpful assistant for HR professionals using a people management platform. Your job is",
    "to suggest short, professional messages they can send to a team's supervisor to share pulse",
    "survey results.",
    "",
    "Rules you must follow:",
    "- Never reveal how any individual responded or hint at who said what. Results are anonymous.",
    '- Write in third person about the team, not first person about the HR user. Say "The team\'s',
    '  results show..." not "I wanted to share...".',
    "- Be factual and calm. No encouragement, no hype, no exclamation points. State what the data",
    "  shows and leave the interpretation to the supervisor.",
    "- Keep each suggestion under 3 sentences.",
    '- Do not offer to do things the HR user cannot do from this screen (no "I can facilitate a',
    '  discussion").',
    "- Do not mention any platform or product name in the message itself.",
    "- Write in sentence case. No all-caps.",
    "- Vary the three suggestions in angle only: one factual summary, one that suggests a follow-up,",
    "  one that notes positive or neutral tone without identifying specifics.",
    "",
    "Context you will receive:",
    "- Team name",
    "- Survey name",
    "- Average score (if linear scale questions exist)",
    "- Number of responses",
    "- Whether the survey is anonymous",
    "- Whether the team is under the minimum group size threshold",
    "",
    `Generate exactly ${MAX_SUGGESTIONS} suggestions based on this context.`,
    'Return ONLY valid JSON, no prose, matching exactly: {"suggestions": [string, string, string]}',
  ].join("\n");
}

function buildUserContent(input: NoteSuggestionInput): string {
  return [
    `Team name: ${input.teamName}`,
    `Survey name: ${input.surveyName}`,
    `Number of responses: ${input.respondedCount} of ${input.recipientCount} team members answered.`,
    `Survey is anonymous: ${input.isAnonymous ? "yes" : "no"}`,
    `Team is under the minimum group size threshold: ${input.belowMinGroup ? "yes" : "no"}`,
    "Aggregated results (averages and distributions only — no individual responses):",
    input.aggregate || "(no quantitative breakdown available)",
  ].join("\n");
}

function parseSuggestions(text: string): string[] {
  let arr: unknown = [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      // Tolerate a bare JSON array in case the model ignores the envelope.
      arr = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).suggestions)) {
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

  async generate(input: NoteSuggestionInput): Promise<string[]> {
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
        isAnonymous: survey.isAnonymous,
        belowMinGroup: team._count.members < MIN_TEAM_SIZE,
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
