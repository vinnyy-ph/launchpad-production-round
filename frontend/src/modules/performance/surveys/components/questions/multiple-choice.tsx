"use client";

import { RadioGroup, RadioGroupItem } from "@/shared/ui";
import type { Question } from "../../types/surveys.types";

export interface MultipleChoiceInputProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Single-select from a fixed option list (MULTIPLE_CHOICE). */
export function MultipleChoiceInput({ question, value, onChange, disabled }: MultipleChoiceInputProps) {
  const options = question.options ?? [];
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-2" disabled={disabled}>
      {options.map((opt) => (
        <label
          key={opt}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-[color:var(--border-primary)] px-4 py-2.5 hover:bg-[color:var(--bg-secondary)]"
        >
          <RadioGroupItem value={opt} id={`${question.id}-${opt}`} aria-label={opt} />
          <span className="text-sm text-[color:var(--text-primary)]">{opt}</span>
        </label>
      ))}
    </RadioGroup>
  );
}
