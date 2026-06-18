"use client";

import { Textarea } from "@/shared/ui";
import type { Question } from "../../types/surveys.types";

export interface LongAnswerInputProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Multi-line free-text answer (LONG_ANSWER). */
export function LongAnswerInput({ question, value, onChange, disabled }: LongAnswerInputProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.isRequired ? "Your answer" : "Your answer (optional)"}
      rows={4}
      disabled={disabled}
      aria-label={question.questionText}
    />
  );
}
