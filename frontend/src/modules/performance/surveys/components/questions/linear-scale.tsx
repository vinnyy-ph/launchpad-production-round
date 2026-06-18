"use client";

import type { Question } from "../../types/surveys.types";

export interface LinearScaleInputProps {
  question: Question;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/** Discrete 1..N rating scale (LINEAR_SCALE) with optional end labels. */
export function LinearScaleInput({ question, value, onChange, disabled }: LinearScaleInputProps) {
  const min = question.scaleMin ?? 1;
  const max = question.scaleMax ?? 5;
  const steps = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            disabled={disabled}
            aria-pressed={value === step}
            aria-label={`Rate ${step}`}
            onClick={() => onChange(step)}
            className={[
              "h-10 min-w-10 flex-1 rounded-lg border px-3 text-sm font-bold transition",
              value === step
                ? "border-transparent bg-[color:var(--gray-neutral-900)] text-white"
                : "border-[color:var(--border-primary)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]",
            ].join(" ")}
          >
            {step}
          </button>
        ))}
      </div>
      {(question.scaleMinLabel || question.scaleMaxLabel) && (
        <div className="flex justify-between text-xs text-[color:var(--text-quaternary)]">
          <span>{question.scaleMinLabel ?? min}</span>
          <span>{question.scaleMaxLabel ?? max}</span>
        </div>
      )}
    </div>
  );
}
