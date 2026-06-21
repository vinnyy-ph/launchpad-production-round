// Mirrors the backend pulse-survey contract. Dates arrive as ISO strings over JSON.

// ─── Enums ────────────────────────────────────────────────────────────────────

export type RecurringType =
  | "ONE_TIME"
  | "WEEKLY"
  | "BI_WEEKLY"
  | "MONTHLY"
  | "BI_MONTHLY"
  | "QUARTERLY"
  | "SEMI_ANNUAL"
  | "ANNUAL";

export type AudienceType = "EVERYONE" | "SUPERVISOR_BASED" | "SPECIFIC_TEAMS";

export type Visibility =
  | "EVERYONE"
  | "SUPERVISOR_BASED"
  | "TEAM_BASED"
  | "HR_ROOT_ONLY"
  | "SPECIFIC_TEAMS";

export type QuestionType =
  | "SHORT_ANSWER"
  | "LONG_ANSWER"
  | "LINEAR_SCALE"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX";

export type ReminderFrequency = "DAILY" | "EVERY_X_DAYS" | "WEEKLY";

// Status is derived client-side; the server has no status enum.
export type SurveyStatus = "active" | "draft" | "closed";

// ─── DTOs ───────────────────────────────────────────────────────────────────

export interface SurveyListItem {
  id: string;
  name: string;
  recurringType: RecurringType;
  audienceType: AudienceType;
  isAnonymous: boolean;
  visibility: Visibility;
  isActive: boolean;
  occurrenceCount: number;
  /** Recipients of the latest occurrence (0 when never activated). */
  recipientCount: number;
  /** Completed responses in the latest occurrence (0 when never activated). */
  respondedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  surveyId: string;
  type: QuestionType;
  questionText: string;
  isRequired: boolean;
  options: string[] | null;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  orderIndex: number;
}

/**
 * Coerce a question's stored `options` into a clean string[]. The API returns a
 * JSON array for survey-created questions, but seeded questions store
 * `{ choices: [...] }` — so handle string[], the `{ choices }` shape, and
 * object[] (`{ label }`), falling back to an empty list.
 */
export function normalizeQuestionOptions(raw: unknown): string[] {
  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { choices?: unknown }).choices)
      ? (raw as { choices: unknown[] }).choices
      : [];
  return arr.map((o) =>
    typeof o === "string" ? o : String((o as { label?: unknown })?.label ?? o ?? ""),
  );
}

export interface AudienceConfig {
  id: string;
  surveyId: string;
  supervisorId: string | null;
  teamId: string | null;
}

export interface VisibilityConfig {
  id: string;
  surveyId: string;
  teamId: string | null;
}

export interface ReminderConfig {
  id: string;
  surveyId: string;
  frequency: ReminderFrequency;
  everyXDays: number | null;
}

export interface SurveyDetail {
  id: string;
  createdBy: string;
  name: string;
  recurringType: RecurringType;
  audienceType: AudienceType;
  isAnonymous: boolean;
  isActive: boolean;
  visibility: Visibility;
  releaseDate: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  occurrenceCount: number;
  questions: Question[];
  audienceConfigs: AudienceConfig[];
  visibilityConfigs: VisibilityConfig[];
  reminderConfig: ReminderConfig | null;
}

export interface AudienceOptions {
  supervisors: { id: string; name: string; jobTitle: string | null }[];
  teams: { id: string; name: string }[];
}

export interface AudiencePreview {
  count: number;
  members: { id: string; name: string }[];
}

// ─── Employee answer flow (PER-10) ─────────────────────────────────────────────

/** An open pulse occurrence the signed-in employee still needs to answer. */
export interface PendingSurvey {
  occurrenceId: string;
  surveyId: string;
  surveyName: string;
  isAnonymous: boolean;
  deadline: string;
  occurrenceNumber: number;
  questions: Question[];
}

/** A pulse the signed-in employee has already completed (history). */
export interface AnsweredSurvey {
  occurrenceId: string;
  surveyId: string;
  surveyName: string;
  isAnonymous: boolean;
  occurrenceNumber: number;
  completedAt: string;
}

/** One of the employee's own answers, paired with its question (PER-23). */
export interface MyAnswer {
  questionId: string;
  questionText: string;
  type: QuestionType;
  options: string[] | null;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  answerText: string | null;
  answerData: number | string | string[] | null;
}

/** The employee's own submitted answers for one completed occurrence.
 *  `answers` is empty for anonymous surveys — content is unrecoverable by design. */
export interface MyAnswers {
  occurrenceId: string;
  surveyId: string;
  surveyName: string;
  occurrenceNumber: number;
  isAnonymous: boolean;
  answers: MyAnswer[];
}

/** A single submitted answer. answerData carries the typed value:
 *  number (LINEAR_SCALE), string (MULTIPLE_CHOICE), string[] (CHECKBOX). */
export interface AnswerInput {
  questionId: string;
  answerText?: string;
  answerData?: number | string | string[];
}

// ─── Results (PER-08 / PER-11) ─────────────────────────────────────────────────

/** Per-question aggregate — shape varies by question type, mirroring the backend. */
export type QuestionResult =
  | {
      questionId: string;
      type: "SHORT_ANSWER" | "LONG_ANSWER";
      questionText: string;
      responseCount: number;
      responses: string[]; // empty for anonymous surveys (free text is withheld)
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

/** A survey whose results the signed-in user may view (discovery list). */
export interface VisibleResultSurvey {
  id: string;
  name: string;
  isAnonymous: boolean;
  status: SurveyStatus;
}

export interface SurveyResults {
  surveyId: string;
  occurrenceId?: string;
  isAnonymous: boolean;
  surveyName: string;
  deadline: string;
  isActive: boolean;
  occurrenceCount: number;
  totalResponses: number;
  /** Recipients of the occurrence(s) in view — denominator for the response rate (unfiltered). */
  recipientCount: number;
  /** Completed responses for the occurrence(s) in view, ignoring scope filters. */
  respondedCount: number;
  filter: { teamId?: string; supervisorId?: string } | null;
  /** true when the minimum-group-size rule fired — no breakdown is shown. */
  suppressed: boolean;
  questions: QuestionResult[]; // empty when suppressed
}

/** One-of filter for the results view (server rejects both at once). */
export interface ResultsFilter {
  teamId?: string;
  supervisorId?: string;
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface QuestionInput {
  type: QuestionType;
  questionText: string;
  isRequired?: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  orderIndex: number;
}

// A single audience config entry — supervisorId for SUPERVISOR_BASED, teamId for SPECIFIC_TEAMS.
export interface AudienceConfigInput {
  supervisorId?: string;
  teamId?: string;
}

export interface ReminderConfigInput {
  frequency?: ReminderFrequency;
  everyXDays?: number;
}

export interface CreateSurveyInput {
  name: string;
  releaseDate?: string; // ISO; default now
  deadline: string; // ISO; must be strictly after releaseDate
  recurringType?: RecurringType;
  audienceType?: AudienceType;
  isAnonymous?: boolean;
  isActive?: boolean;
  visibility?: Visibility;
  questions: QuestionInput[];
  audienceConfigs?: AudienceConfigInput[];
  reminderConfig?: ReminderConfigInput;
}

export type UpdateSurveyInput = Partial<CreateSurveyInput>;

export interface PreviewAudienceInput {
  audienceType: AudienceType;
  audienceConfigs?: AudienceConfigInput[];
}

// ─── Display labels ─────────────────────────────────────────────────────────

export const RECURRING_TYPE_LABEL: Record<RecurringType, string> = {
  ONE_TIME: "One-time",
  WEEKLY: "Weekly",
  BI_WEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  BI_MONTHLY: "Bi-monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-annual",
  ANNUAL: "Annual",
};

export const AUDIENCE_TYPE_LABEL: Record<AudienceType, string> = {
  EVERYONE: "Everyone",
  SUPERVISOR_BASED: "Supervisor-based",
  SPECIFIC_TEAMS: "Specific teams",
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  EVERYONE: "Everyone",
  SUPERVISOR_BASED: "Supervisor-based",
  TEAM_BASED: "Team-based",
  HR_ROOT_ONLY: "HR + root",
  SPECIFIC_TEAMS: "Specific teams",
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SHORT_ANSWER: "Short answer",
  LONG_ANSWER: "Long answer",
  LINEAR_SCALE: "Linear scale",
  MULTIPLE_CHOICE: "Multiple choice",
  CHECKBOX: "Checkbox",
};

export const REMINDER_FREQUENCY_LABEL: Record<ReminderFrequency, string> = {
  DAILY: "Daily",
  EVERY_X_DAYS: "Every X days",
  WEEKLY: "Weekly",
};

export const STATUS_LABEL: Record<SurveyStatus, string> = {
  active: "Active",
  draft: "Draft",
  closed: "Closed",
};

// active = live; draft = never activated; closed = was active, now inactive.
export function deriveStatus(item: {
  isActive: boolean;
  occurrenceCount: number;
}): SurveyStatus {
  if (item.isActive) return "active";
  if (item.occurrenceCount === 0) return "draft";
  return "closed";
}
