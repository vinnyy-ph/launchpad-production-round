import type { QuestionType } from "@prisma/client";

/** HR's request: a plain-language goal and how many questions to generate. */
export interface GenerateQuestionsInput {
  goal: string;
  count: number;
}

/**
 * A validated question ready to drop into the builder. Matches the survey question shape
 * minus id/orderIndex — the frontend assigns those when appending to the draft list.
 */
export interface GeneratedQuestion {
  type: QuestionType;
  questionText: string;
  isRequired: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

/** LLM port — real impl calls OpenAI; tests inject a fake and assert call counts. */
export interface AiQuestionsGeneratorPort {
  readonly model: string;
  /** Returns the raw (unvalidated) questions array parsed from the model's JSON envelope. */
  generate(input: GenerateQuestionsInput, correction?: string): Promise<unknown[]>;
}
