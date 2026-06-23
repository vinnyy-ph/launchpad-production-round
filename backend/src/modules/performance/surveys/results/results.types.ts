export type QuestionResult =
  | {
      questionId: string;
      type: "SHORT_ANSWER" | "LONG_ANSWER";
      questionText: string;
      responseCount: number;
      responses: string[];
    }
  | {
      questionId: string;
      type: "LINEAR_SCALE";
      questionText: string;
      responseCount: number;
      average: number;
      min: number;
      max: number;
      distribution: Record<string, number>;
    }
  | {
      questionId: string;
      type: "MULTIPLE_CHOICE" | "CHECKBOX";
      questionText: string;
      responseCount: number;
      counts: Record<string, number>;
    };

export interface VisibleResultSurveyDto {
  id: string;
  name: string;
  isAnonymous: boolean;
  status: "active" | "closed";
}

/**
 * HR-only hint attached to an anonymous, team-filtered results view of a small
 * (sub-MIN_TEAM_SIZE) team. Drives the "send results to the team's supervisor" action.
 * Present only for HR viewers on that exact view — never for any other role or view.
 */
export interface SmallTeamShareDto {
  occurrenceId: string;
  teamId: string;
  teamName: string;
  /** The team's supervisor (leader). null when the team has no resolvable supervisor. */
  supervisorId: string | null;
  supervisorName: string | null;
  /** The send action is only allowed once the occurrence is completed (closed or past deadline). */
  occurrenceCompleted: boolean;
  /** ISO timestamp of the last share, or null if never shared. */
  alreadySharedAt: string | null;
}

export interface SurveyResultsResponseDto {
  success: boolean;
  data: {
    surveyId: string;
    occurrenceId?: string; // only on the occurrence-level endpoint
    isAnonymous: boolean;
    surveyName: string;
    deadline: string; // ISO
    isActive: boolean;
    occurrenceCount: number;
    totalResponses: number;
    /** Recipients of the occurrence(s) in view — denominator for the response rate (unfiltered). */
    recipientCount: number;
    /** Completed responses for the occurrence(s) in view, ignoring scope filters. */
    respondedCount: number;
    filter: { teamId?: string; supervisorId?: string } | null;
    suppressed: boolean; // true when min-group-size rule fired
    questions: QuestionResult[]; // empty when suppressed = true
    /** HR-only; present on an anonymous small-team filtered view. Drives the share action. */
    smallTeamShare?: SmallTeamShareDto;
  };
}
