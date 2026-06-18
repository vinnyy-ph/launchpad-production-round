import type { AnswerInput } from "./responses.types";

export function parseAnswers(raw: unknown): AnswerInput[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("answers must be a non-empty array");
  }

  const parsed: AnswerInput[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      throw new Error("Each answer must be an object");
    }

    const { questionId, answerText, answerData } = item as any;

    if (typeof questionId !== "string" || questionId.trim() === "") {
      throw new Error("questionId must be a non-empty string");
    }

    if (answerText === undefined && answerData === undefined) {
      throw new Error("Each answer must provide answerText or answerData");
    }

    if (answerText !== undefined && typeof answerText !== "string" && answerText !== null) {
      throw new Error("answerText must be a string or null");
    }

    parsed.push({
      questionId,
      ...(answerText !== undefined && { answerText }),
      ...(answerData !== undefined && { answerData }),
    });
  }

  return parsed;
}
