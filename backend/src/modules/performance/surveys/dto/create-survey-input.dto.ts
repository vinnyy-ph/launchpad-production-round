import type {
  AudienceType,
  QuestionType,
  RecurringType,
  ReminderFrequency,
  SurveyVisibility,
} from "@prisma/client";

export interface CreateSurveyQuestionInput {
  type: QuestionType;
  questionText: string;
  isRequired?: boolean;
  /** Choices — only for MULTIPLE_CHOICE / CHECKBOX */
  options?: unknown[];
  /** Lower bound — only for LINEAR_SCALE */
  scaleMin?: number;
  /** Upper bound — only for LINEAR_SCALE */
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  orderIndex: number;
}

export interface CreateAudienceConfigInput {
  /** Provide one of supervisorId or teamId */
  supervisorId?: string;
  teamId?: string;
}

export interface CreateReminderConfigInput {
  frequency?: ReminderFrequency;
  /** Required when frequency = EVERY_X_DAYS */
  everyXDays?: number;
}

export interface CreateSurveyInput {
  name: string;
  recurringType?: RecurringType;
  audienceType?: AudienceType;
  isAnonymous?: boolean;
  isActive?: boolean;
  visibility?: SurveyVisibility;
  questions: CreateSurveyQuestionInput[];
  /** Only meaningful when audienceType is SUPERVISOR_BASED or SPECIFIC_TEAMS */
  audienceConfigs?: CreateAudienceConfigInput[];
  reminderConfig?: CreateReminderConfigInput;
}
