import type { SurveyResponseRow } from "../rules/response-firewall";
import type { ValidatableQuestion } from "../rules/answer-validation";

export interface AnswerInput {
  questionId: string;
  answerText?: string | null;
  answerData?: unknown;
}

export interface RespondInput {
  /** The signed-in user's id (req.user.id). The responder Employee is resolved from it. */
  userId: string;
  occurrenceId: string;
  answers: AnswerInput[];
}

export interface ResponderEmployee {
  id: string;
  supervisorId: string | null;
  teamIds: string[];
}

export interface OccurrenceForResponse {
  id: string;
  isClosed: boolean;
  deadline: Date;
  isAnonymous: boolean;
  /** The survey's questions, used to validate the submitted answers server-side. */
  questions: ValidatableQuestion[];
}

/**
 * The persistence surface the respond flow needs. The service depends on this interface
 * (not the concrete Prisma repository), so it is unit-testable with an in-memory fake and
 * the anonymity firewall is provable without a database.
 */
export interface ResponsesRepositoryPort {
  findResponder(userId: string): Promise<ResponderEmployee | null>;
  findOccurrence(occurrenceId: string): Promise<OccurrenceForResponse | null>;
  isAudienceMember(occurrenceId: string, employeeId: string): Promise<boolean>;
  hasCompleted(occurrenceId: string, employeeId: string): Promise<boolean>;
  persistResponse(args: {
    row: SurveyResponseRow;
    answers: AnswerInput[];
    employeeId: string;
  }): Promise<void>;
}
