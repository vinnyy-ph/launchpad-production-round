import type { MyAnswerItem } from "../me/me.types";

/** One audience member in the drill-down name list. */
export interface RosterMember {
  employeeId: string;
  name: string;
  /** Whether this member has responded to the occurrence (completion is tracked separately). */
  submitted: boolean;
}

export interface RespondentRosterDto {
  occurrenceId: string;
  surveyId: string;
  surveyName: string;
  occurrenceNumber: number;
  isAnonymous: boolean;
  /** Only the individuals this viewer is authorized to drill into. Empty for anonymous
   *  surveys (named-only) and for viewers without individual-view authority. */
  respondents: RosterMember[];
}

export interface IndividualAnswersDto {
  occurrenceId: string;
  surveyId: string;
  surveyName: string;
  occurrenceNumber: number;
  respondent: { employeeId: string; name: string };
  /** False when the target is in the audience but has not responded to this occurrence yet. */
  submitted: boolean;
  /** When the target actually submitted; null when they have not. */
  submittedAt: string | null;
  /** Empty when not submitted. */
  answers: MyAnswerItem[];
}
