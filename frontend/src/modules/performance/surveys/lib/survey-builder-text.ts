import {
  mapPeopleFieldTextError,
  validatePeopleFieldText,
} from "@/modules/people/people-text";
import { SURVEY_TEXT_LIMITS } from "../schemas/survey-form.schema";

const SURVEY_BUILDER_MESSAGES = {
  name: "Please enter a valid survey name.",
  question: "Please enter a valid question.",
  option: "Please enter a valid option.",
  scaleLabel: "Please enter a valid scale label.",
} as const;

function mapSurveyFieldError(
  value: string,
  label: string,
  maxLen: number,
  fallback: string,
): string | undefined {
  return mapPeopleFieldTextError(
    validatePeopleFieldText(value, label, maxLen),
    fallback,
  );
}

export function surveyNameChangeError(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return mapSurveyFieldError(value, "Name", SURVEY_TEXT_LIMITS.NAME, SURVEY_BUILDER_MESSAGES.name);
}

export function surveyNameSubmitError(value: string): string | undefined {
  if (!value.trim()) return "Name is required.";
  return surveyNameChangeError(value);
}

export function surveyQuestionChangeError(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return mapSurveyFieldError(
    value,
    "Question",
    SURVEY_TEXT_LIMITS.QUESTION_TEXT,
    SURVEY_BUILDER_MESSAGES.question,
  );
}

export function surveyQuestionSubmitError(value: string, index: number): string | undefined {
  if (!value.trim()) return `Question ${index + 1} needs a prompt.`;
  const textError = surveyQuestionChangeError(value);
  return textError ? `Question ${index + 1}: ${textError}` : undefined;
}

export function surveyOptionChangeError(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return mapSurveyFieldError(value, "Option", SURVEY_TEXT_LIMITS.OPTION, SURVEY_BUILDER_MESSAGES.option);
}

export function surveyOptionsSubmitError(options: string[], index: number): string | undefined {
  if (options.filter((o) => o.trim()).length < 1) {
    return `Question ${index + 1} needs at least one option.`;
  }
  for (const option of options) {
    if (!option.trim()) continue;
    const textError = surveyOptionChangeError(option);
    if (textError) return `Question ${index + 1}: ${textError}`;
  }
  return undefined;
}

export function surveyScaleLabelChangeError(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return mapSurveyFieldError(
    value,
    "Scale label",
    SURVEY_TEXT_LIMITS.SCALE_LABEL,
    SURVEY_BUILDER_MESSAGES.scaleLabel,
  );
}

export function surveyScaleLabelsSubmitError(
  minLabel: string,
  maxLabel: string,
  index: number,
): string | undefined {
  for (const labelValue of [minLabel, maxLabel]) {
    const textError = surveyScaleLabelChangeError(labelValue);
    if (textError) return `Question ${index + 1}: ${textError}`;
  }
  return undefined;
}
