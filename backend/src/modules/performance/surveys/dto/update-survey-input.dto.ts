import type {
  AudienceType,
  RecurringType,
  SurveyVisibility,
} from "@prisma/client";
import type {
  CreateSurveyQuestionInput,
  CreateAudienceConfigInput,
  CreateReminderConfigInput,
} from "./create-survey-input.dto";

export interface UpdateSurveyInput {
  name?: string;
  recurringType?: RecurringType;
  audienceType?: AudienceType;
  isAnonymous?: boolean;
  isActive?: boolean;
  visibility?: SurveyVisibility;
  questions?: CreateSurveyQuestionInput[];
  audienceConfigs?: CreateAudienceConfigInput[];
  reminderConfig?: CreateReminderConfigInput | null;
}
