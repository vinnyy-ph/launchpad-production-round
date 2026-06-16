import type { CreateEvaluationInput } from "./evaluations.types";

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

  return {
    revieweeId: b.revieweeId,
    evaluationPeriod: b.evaluationPeriod,
    grade: b.grade,
    ...(typeof b.highlights === "string" && { highlights: b.highlights }),
    ...(typeof b.lowlights === "string" && { lowlights: b.lowlights }),
    ...(typeof b.evaluation === "string" && { evaluation: b.evaluation }),
    ...(typeof b.recommendation === "string" && { recommendation: b.recommendation }),
    ...(typeof b.supportingDocUrl === "string" && { supportingDocUrl: b.supportingDocUrl }),
  };
}
