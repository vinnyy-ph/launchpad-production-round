"use client";

import { Input } from "@/shared/ui";
import type { Question } from "../../types/surveys.types";

export interface ShortAnswerInputProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Single-line free-text answer (SHORT_ANSWER). */
export function ShortAnswerInput({ question, value, onChange, disabled }: ShortAnswerInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.isRequired ? "Your answer" : "Your answer (optional)"}
      disabled={disabled}
      aria-label={question.questionText}
    />
  );
}
