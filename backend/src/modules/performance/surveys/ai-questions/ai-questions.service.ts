import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { SurveysValidation } from "../surveys.validation";
import { buildCorrectionContent } from "./ai-questions.prompt";
import { OpenAiAiQuestionsGenerator } from "./ai-questions.generator";
import type { AiQuestionsGeneratorPort, GenerateQuestionsInput, GeneratedQuestion } from "./ai-questions.types";

/**
 * HR-only: turns a survey goal + count into validated draft questions. Calls the LLM, validates
 * the output against the 5-type rules, and retries ONCE with a corrective message before giving
 * up. Client/transport failures surface as AI_UNAVAILABLE; output that can't be made valid surfaces
 * as AI_QUESTIONS_INVALID.
 */
export class AiQuestionsService {
  constructor(
    private readonly generator: AiQuestionsGeneratorPort = new OpenAiAiQuestionsGenerator(),
    private readonly validation = new SurveysValidation(),
  ) {}

  async generate(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    let raw: unknown[];
    try {
      raw = await this.generator.generate(input);
    } catch {
      throw new Error(SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE);
    }

    try {
      return this.validation.validateGeneratedQuestions(raw);
    } catch (firstError) {
      const correction = buildCorrectionContent(
        firstError instanceof Error ? firstError.message : "invalid output",
      );

      let retryRaw: unknown[];
      try {
        retryRaw = await this.generator.generate(input, correction);
      } catch {
        throw new Error(SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE);
      }

      try {
        return this.validation.validateGeneratedQuestions(retryRaw);
      } catch {
        throw new Error(SURVEY_ERROR_MESSAGES.AI_QUESTIONS_INVALID);
      }
    }
  }
}
