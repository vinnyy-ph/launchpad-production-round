export type RecurringType =
  | "ONE_TIME"
  | "WEEKLY"
  | "BI_WEEKLY"
  | "MONTHLY"
  | "BI_MONTHLY"
  | "QUARTERLY"
  | "SEMI_ANNUAL"
  | "ANNUAL";

export type ApiAudienceType = "EVERYONE" | "SUPERVISOR_BASED" | "SPECIFIC_TEAMS";

export type ApiSurveyVisibility =
  | "EVERYONE"
  | "SUPERVISOR_BASED"
  | "TEAM_BASED"
  | "HR_ROOT_ONLY"
  | "SPECIFIC_TEAMS";

export type ApiQuestionType =
  | "SHORT_ANSWER"
  | "LONG_ANSWER"
  | "LINEAR_SCALE"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX";

export type ReminderFrequency = "DAILY" | "EVERY_X_DAYS" | "WEEKLY";

export interface SurveyListItemDto {
  id: string;
  name: string;
  recurringType: RecurringType;
  audienceType: ApiAudienceType;
  isAnonymous: boolean;
  visibility: ApiSurveyVisibility;
  isActive: boolean;
  occurrenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
