import type {
  AudienceType,
  QuestionType,
  RecurringType,
  ReminderFrequency,
  SurveyVisibility,
} from "@prisma/client";

/** Passed from SurveysService → SurveysRepository after employee resolution. */
export interface CreateSurveyData {
  createdBy: string; // resolved Employee.id
  name: string;
  recurringType: RecurringType;
  audienceType: AudienceType;
  isAnonymous: boolean;
  isActive: boolean;
  visibility: SurveyVisibility;
  releaseDate: Date;
  deadline: Date;
  questions: CreateSurveyQuestionData[];
  audienceConfigs: CreateAudienceConfigData[];
  reminderConfig?: CreateReminderConfigData;
}

export interface CreateSurveyQuestionData {
  type: QuestionType;
  questionText: string;
  isRequired: boolean;
  options?: unknown;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  orderIndex: number;
}

export interface CreateAudienceConfigData {
  supervisorId?: string;
  teamId?: string;
}

export interface CreateReminderConfigData {
  frequency: ReminderFrequency;
  everyXDays?: number;
}
