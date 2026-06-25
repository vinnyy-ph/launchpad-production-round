"use client";

import { Input } from "@/shared/ui";
import {
  surveyAnswerChangeError,
  surveyAnswerMaxLength,
} from "../../lib/survey-answer-text";
import type { Question } from "../../types/surveys.types";

export interface ShortAnswerInputProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  onErrorChange?: (error: string | undefined) => void;
  disabled?: boolean;
  error?: string;
}

/** Single-line free-text answer (SHORT_ANSWER). */
export function ShortAnswerInput({
  question,
  value,
  onChange,
  onErrorChange,
  disabled,
  error,
}: ShortAnswerInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        onChange(next);
        onErrorChange?.(surveyAnswerChangeError(next, "SHORT_ANSWER"));
      }}
      placeholder={question.isRequired ? "Your answer" : "Your answer (optional)"}
      disabled={disabled}
      aria-label={question.questionText}
      aria-invalid={Boolean(error)}
      maxLength={surveyAnswerMaxLength("SHORT_ANSWER")}
    />
  );
}
