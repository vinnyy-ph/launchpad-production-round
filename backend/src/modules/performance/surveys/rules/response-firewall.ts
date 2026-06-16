export interface ResponseInput {
  occurrenceId: string;
  employeeId: string;
  isAnonymous: boolean;
  /** Identity-free grouping snapshots, captured at submit so anonymous results can still
   *  be filtered by supervisor/team without re-identifying the respondent. */
  respondentSupervisorId: string | null;
  respondentTeamIds: string[];
}

/** Shape for `prisma.surveyResponse.create({ data })` — field names match the real schema. */
export interface SurveyResponseRow {
  occurrenceId: string;
  /** Null when the survey is anonymous — the firewall. */
  employeeId: string | null;
  respondentSupervisorId: string | null;
  respondentTeamIds: string[];
}

/**
 * Build the SurveyResponse row honoring the anonymity firewall: the employee link is
 * dropped when the survey is anonymous, while the identity-free snapshots are always kept.
 * Completion is tracked separately (SurveyCompletion) so reminders/counts still work.
 */
export function buildResponseRow(input: ResponseInput): SurveyResponseRow {
  return {
    occurrenceId: input.occurrenceId,
    employeeId: input.isAnonymous ? null : input.employeeId,
    respondentSupervisorId: input.respondentSupervisorId,
    respondentTeamIds: input.respondentTeamIds,
  };
}
