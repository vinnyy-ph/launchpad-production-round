const VALID_TYPES = [
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "LINEAR_SCALE",
  "MULTIPLE_CHOICE",
  "CHECKBOX",
] as const;

export function buildSystemPrompt(): string {
  return [
    "You are an assistant that drafts employee pulse-survey questions for HR.",
    "Return ONLY a valid JSON object, no prose, matching exactly this shape:",
    `{"questions": [{"type": string, "questionText": string, "isRequired": boolean, "options": string[], "scaleMin": number, "scaleMax": number, "scaleMinLabel": string, "scaleMaxLabel": string}]}`,
    "",
    `"type" MUST be one of exactly these five values: ${VALID_TYPES.join(", ")}.`,
    "Field rules per type (include ONLY the fields a type needs):",
    "- SHORT_ANSWER / LONG_ANSWER: questionText only. No options, no scale fields.",
    "- MULTIPLE_CHOICE / CHECKBOX: questionText plus a non-empty options array of 2-6 short strings.",
    "- LINEAR_SCALE: questionText plus integer scaleMin and scaleMax (e.g. 1 and 5); scaleMinLabel and scaleMaxLabel are optional short labels.",
    "",
    "questionText must be a clear, single question under 500 characters.",
    "Set isRequired to true unless a question is clearly optional.",
    "Do not invent any question type outside the five listed.",
  ].join("\n");
}

export function buildUserContent(goal: string, count: number): string {
  return [
    `Survey goal: ${goal}`,
    `Generate exactly ${count} questions that serve this goal.`,
    "Vary the question types where it makes sense, but only use the five valid types.",
  ].join("\n");
}

export function buildCorrectionContent(error: string): string {
  return [
    "Your previous response was rejected by validation with this error:",
    error,
    "",
    `Regenerate the questions as valid JSON. "type" must be one of: ${VALID_TYPES.join(", ")}.`,
    "MULTIPLE_CHOICE/CHECKBOX must include a non-empty options array; LINEAR_SCALE must include numeric scaleMin and scaleMax.",
    'Return ONLY {"questions": [...]} with no extra commentary.',
  ].join("\n");
}

/** Pull the questions array out of the model's JSON, tolerating a bare array. Returns [] on junk. */
export function parseQuestions(text: string): unknown[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown }).questions)) {
      return (parsed as { questions: unknown[] }).questions;
    }
  } catch {
    // fall through
  }
  return [];
}
