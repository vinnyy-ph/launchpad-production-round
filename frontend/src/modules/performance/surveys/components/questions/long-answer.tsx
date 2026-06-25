"use client";

import { Textarea } from "@/shared/ui";
import {
  surveyAnswerChangeError,
  surveyAnswerMaxLength,
} from "../../lib/survey-answer-text";
import type { Question } from "../../types/surveys.types";

export interface LongAnswerInputProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  onErrorChange?: (error: string | undefined) => void;
  disabled?: boolean;
  error?: string;
}

/** Multi-line free-text answer (LONG_ANSWER). */
export function LongAnswerInput({
  question,
  value,
  onChange,
  onErrorChange,
  disabled,
  error,
}: LongAnswerInputProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        onChange(next);
        onErrorChange?.(surveyAnswerChangeError(next, "LONG_ANSWER"));
      }}
      placeholder={question.isRequired ? "Your answer" : "Your answer (optional)"}
      rows={4}
      disabled={disabled}
      aria-label={question.questionText}
      aria-invalid={Boolean(error)}
      maxLength={surveyAnswerMaxLength("LONG_ANSWER")}
    />
  );
}
