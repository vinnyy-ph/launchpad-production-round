"use client";

import { Checkbox } from "@/shared/ui";
import type { Question } from "../../types/surveys.types";

export interface CheckboxInputProps {
  question: Question;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

/** Multi-select from a fixed option list (CHECKBOX). */
export function CheckboxInput({ question, value, onChange, disabled }: CheckboxInputProps) {
  const options = question.options ?? [];
  const toggle = (opt: string, checked: boolean) =>
    onChange(checked ? [...value, opt] : value.filter((o) => o !== opt));

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-[color:var(--border-primary)] px-4 py-2.5 hover:bg-[color:var(--bg-secondary)]"
        >
          <Checkbox
            checked={value.includes(opt)}
            onCheckedChange={(c) => toggle(opt, c === true)}
            id={`${question.id}-${opt}`}
            disabled={disabled}
            aria-label={opt}
          />
          <span className="text-sm text-[color:var(--text-primary)]">{opt}</span>
        </label>
      ))}
    </div>
  );
}
