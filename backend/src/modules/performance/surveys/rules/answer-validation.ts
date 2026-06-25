import type { QuestionType } from "@prisma/client";
import { assertSafeText } from "../../../../core/validation/text-input";
import { SURVEY_TEXT_LIMITS } from "../surveys.constants";

/** The question fields needed to validate a submitted answer against its type. */
export interface ValidatableQuestion {
  id: string;
  type: QuestionType;
  isRequired: boolean;
  options: unknown; // Json — a string[] for MULTIPLE_CHOICE / CHECKBOX
  scaleMin: number | null;
  scaleMax: number | null;
}

export interface ValidatableAnswer {
  questionId: string;
  answerText?: string | null;
  answerData?: unknown;
}

/** Distinct messages so the controller can map each failure to HTTP 400. */
export const ANSWER_ERRORS = {
  UNKNOWN_QUESTION: "Answer references a question that is not part of this survey",
  MISSING_REQUIRED: "A required question was not answered",
  INVALID_TEXT: "Text answer must be a non-empty string",
  INVALID_SCALE: "Linear-scale answer must be a whole number within the question's range",
  INVALID_CHOICE: "Multiple-choice answer must be one of the question's options",
  INVALID_CHECKBOX: "Checkbox answer must be a non-empty list of the question's options",
} as const;

function optionList(options: unknown): string[] {
  return Array.isArray(options) ? options.filter((o): o is string => typeof o === "string") : [];
}

/** Whether an answer carries a usable value (used to decide if a required question is answered). */
function hasValue(a: ValidatableAnswer): boolean {
  if (typeof a.answerText === "string" && a.answerText.trim() !== "") return true;
  if (a.answerData !== undefined && a.answerData !== null) {
    if (Array.isArray(a.answerData)) return a.answerData.length > 0;
    if (typeof a.answerData === "string") return a.answerData.trim() !== "";
    return true; // number
  }
  return false;
}

/**
 * Server-side validation of submitted answers against the survey's own questions. Rejects
 * answers to questions that aren't on the survey, missing required questions, and answers
 * whose shape doesn't match their question type. Pure — no DB access, so it is unit-testable
 * and is the same gate whether called from the API or a test.
 */
export function validateAnswers(
  questions: ValidatableQuestion[],
  answers: ValidatableAnswer[],
): void {
  const byId = new Map(questions.map((q) => [q.id, q]));

  // 1. Every submitted answer must target a real question on this survey.
  for (const a of answers) {
    if (!byId.has(a.questionId)) throw new Error(ANSWER_ERRORS.UNKNOWN_QUESTION);
  }

  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

  for (const q of questions) {
    const a = answerByQuestion.get(q.id);
    const answered = a !== undefined && hasValue(a);

    // 2. Required questions must be answered.
    if (q.isRequired && !answered) throw new Error(ANSWER_ERRORS.MISSING_REQUIRED);

    // Optional questions may be skipped; only validate the shape of what was provided.
    if (!answered || a === undefined) continue;

    // 3. Type-specific shape validation.
    switch (q.type) {
      case "SHORT_ANSWER":
      case "LONG_ANSWER": {
        if (typeof a.answerText !== "string" || a.answerText.trim() === "") {
          throw new Error(ANSWER_ERRORS.INVALID_TEXT);
        }
        const trimmed = a.answerText.trim();
        const maxLen =
          q.type === "SHORT_ANSWER"
            ? SURVEY_TEXT_LIMITS.ANSWER_SHORT
            : SURVEY_TEXT_LIMITS.ANSWER_LONG;
        assertSafeText(trimmed, "answerText", maxLen);
        break;
      }
      case "LINEAR_SCALE": {
        const n = typeof a.answerData === "number" ? a.answerData : Number(a.answerData);
        const min = q.scaleMin ?? 1;
        const max = q.scaleMax ?? 5;
        if (!Number.isInteger(n) || n < min || n > max) {
          throw new Error(ANSWER_ERRORS.INVALID_SCALE);
        }
        break;
      }
      case "MULTIPLE_CHOICE": {
        const opts = optionList(q.options);
        if (typeof a.answerData !== "string" || !opts.includes(a.answerData)) {
          throw new Error(ANSWER_ERRORS.INVALID_CHOICE);
        }
        break;
      }
      case "CHECKBOX": {
        const opts = optionList(q.options);
        if (
          !Array.isArray(a.answerData) ||
          a.answerData.length === 0 ||
          !a.answerData.every((v) => typeof v === "string" && opts.includes(v))
        ) {
          throw new Error(ANSWER_ERRORS.INVALID_CHECKBOX);
        }
        break;
      }
    }
  }
}
