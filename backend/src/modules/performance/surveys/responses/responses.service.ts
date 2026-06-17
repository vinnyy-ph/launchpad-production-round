import { buildResponseRow } from "../rules/response-firewall";
import type { RespondInput, ResponsesRepositoryPort } from "./responses.types";

/** Distinct messages so the controller can map each failure to an HTTP status. */
export const RESPOND_ERRORS = {
  EMPLOYEE_NOT_FOUND: "Employee not found",
  OCCURRENCE_NOT_FOUND: "Occurrence not found",
  OCCURRENCE_CLOSED: "Occurrence closed",
  NOT_IN_AUDIENCE: "Not in audience",
  ALREADY_RESPONDED: "Already responded",
} as const;

/**
 * Records an employee's answers to a pulse occurrence, enforcing the anonymity firewall
 * (employee link dropped on anonymous surveys) and the submit guards server-side.
 */
export class ResponsesService {
  constructor(private readonly repo: ResponsesRepositoryPort) {}

  async respond(input: RespondInput): Promise<void> {
    const employee = await this.repo.findResponder(input.userId);
    if (!employee) throw new Error(RESPOND_ERRORS.EMPLOYEE_NOT_FOUND);

    const occurrence = await this.repo.findOccurrence(input.occurrenceId);
    if (!occurrence) throw new Error(RESPOND_ERRORS.OCCURRENCE_NOT_FOUND);

    if (occurrence.isClosed || occurrence.deadline.getTime() <= Date.now()) {
      throw new Error(RESPOND_ERRORS.OCCURRENCE_CLOSED);
    }
    if (!(await this.repo.isAudienceMember(occurrence.id, employee.id))) {
      throw new Error(RESPOND_ERRORS.NOT_IN_AUDIENCE);
    }
    if (await this.repo.hasCompleted(occurrence.id, employee.id)) {
      throw new Error(RESPOND_ERRORS.ALREADY_RESPONDED);
    }

    // Anonymity firewall: nulls the employee link on the response when anonymous, while
    // completion (persisted below by the repo) still records identity for reminders/counts.
    const row = buildResponseRow({
      occurrenceId: occurrence.id,
      employeeId: employee.id,
      isAnonymous: occurrence.isAnonymous,
      respondentSupervisorId: employee.supervisorId,
      respondentTeamIds: employee.teamIds,
    });

    await this.repo.persistResponse({ row, answers: input.answers, employeeId: employee.id });
  }
}
