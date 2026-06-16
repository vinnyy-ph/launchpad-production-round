import { createEvaluation } from "./evaluations.repository";
import type { CreateEvaluationInput } from "./evaluations.types";

// TODO: replace with employee lookup via req.user.id → employees.userId
//       once the employee module is wired up
const MOCK_REVIEWER_ID = "OOOOOOO";

export async function handleCreateEvaluation(data: CreateEvaluationInput) {
  return createEvaluation(MOCK_REVIEWER_ID, data);
}
