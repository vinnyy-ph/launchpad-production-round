import type {
  AudienceType,
  RecurringType,
  SurveyVisibility,
} from "@prisma/client";

/** Lightweight DTO returned in the paginated list — no questions, no configs. */
export interface SurveyListItemDto {
  id: string;
  name: string;
  recurringType: RecurringType;
  audienceType: AudienceType;
  isAnonymous: boolean;
  visibility: SurveyVisibility;
  isActive: boolean;
  occurrenceCount: number;
  createdAt: Date;
  updatedAt: Date;
}
