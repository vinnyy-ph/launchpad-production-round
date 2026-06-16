import type { CreateEvaluationInput, UpdateEvaluationInput } from "./evaluations.types";

export function validateCreateEvaluation(body: unknown): CreateEvaluationInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body is required");
  }

  const b = body as Record<string, unknown>;

  if (!b.revieweeId || typeof b.revieweeId !== "string") {
    throw new Error("revieweeId is required");
  }
  if (!b.evaluationPeriod || typeof b.evaluationPeriod !== "string") {
    throw new Error("evaluationPeriod is required");
  }
  if (
    typeof b.grade !== "number" ||
    !Number.isInteger(b.grade) ||
    b.grade < 1 ||
    b.grade > 5
  ) {
    throw new Error("grade must be an integer between 1 and 5");
  }
  if (b.send !== undefined && typeof b.send !== "boolean") {
    throw new Error("send must be a boolean");
  }

  return {
    revieweeId: b.revieweeId,
    evaluationPeriod: b.evaluationPeriod,
    grade: b.grade,
    ...(typeof b.highlights === "string" && { highlights: b.highlights }),
    ...(typeof b.lowlights === "string" && { lowlights: b.lowlights }),
    ...(typeof b.evaluation === "string" && { evaluation: b.evaluation }),
    ...(typeof b.recommendation === "string" && { recommendation: b.recommendation }),
    ...(typeof b.supportingDocUrl === "string" && { supportingDocUrl: b.supportingDocUrl }),
    ...(typeof b.send === "boolean" && { send: b.send }),
  };
}

export function validateUpdateEvaluation(body: unknown): UpdateEvaluationInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body is required");
  }

  const b = body as Record<string, unknown>;
  const result: UpdateEvaluationInput = {};

  if (b.revieweeId !== undefined) {
    if (typeof b.revieweeId !== "string" || !b.revieweeId)
      throw new Error("revieweeId must be a string");
    result.revieweeId = b.revieweeId;
  }
  if (b.evaluationPeriod !== undefined) {
    if (typeof b.evaluationPeriod !== "string" || !b.evaluationPeriod)
      throw new Error("evaluationPeriod must be a string");
    result.evaluationPeriod = b.evaluationPeriod;
  }
  if (b.grade !== undefined) {
    if (typeof b.grade !== "number" || !Number.isInteger(b.grade) || b.grade < 1 || b.grade > 5)
      throw new Error("grade must be an integer between 1 and 5");
    result.grade = b.grade;
  }
  if (b.send !== undefined) {
    if (typeof b.send !== "boolean") throw new Error("send must be a boolean");
    result.send = b.send;
  }

  for (const field of [
    "highlights",
    "lowlights",
    "evaluation",
    "recommendation",
    "supportingDocUrl",
  ] as const) {
    if (b[field] !== undefined) {
      if (typeof b[field] !== "string") throw new Error(`${field} must be a string`);
      result[field] = b[field] as string;
    }
  }

  if (Object.keys(result).length === 0) {
    throw new Error("No fields provided to update");
  }

  return result;
}
