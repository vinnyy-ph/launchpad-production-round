import type {
  AudienceType,
  QuestionType,
  RecurringType,
  ReminderFrequency,
  SurveyVisibility,
} from "@prisma/client";

export interface SurveyQuestionResponseDto {
  id: string;
  surveyId: string;
  type: QuestionType;
  questionText: string;
  isRequired: boolean;
  options: unknown | null;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyAudienceConfigResponseDto {
  id: string;
  surveyId: string;
  supervisorId: string | null;
  teamId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyReminderConfigResponseDto {
  id: string;
  surveyId: string;
  frequency: ReminderFrequency;
  everyXDays: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyResponseDto {
  id: string;
  createdBy: string;
  name: string;
  recurringType: RecurringType;
  audienceType: AudienceType;
  isAnonymous: boolean;
  isActive: boolean;
  visibility: SurveyVisibility;
  createdAt: Date;
  updatedAt: Date;
  questions: SurveyQuestionResponseDto[];
  audienceConfigs: SurveyAudienceConfigResponseDto[];
  reminderConfig: SurveyReminderConfigResponseDto | null;
}
