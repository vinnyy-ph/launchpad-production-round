"use client";

import { AlertCircle } from "lucide-react";
import type { Question } from "../../types/surveys.types";
import { ShortAnswerInput } from "./short-answer";
import { LongAnswerInput } from "./long-answer";
import { LinearScaleInput } from "./linear-scale";
import { MultipleChoiceInput } from "./multiple-choice";
import { CheckboxInput } from "./checkbox";

export type AnswerValue = string | number | string[] | undefined;

export interface QuestionFieldProps {
  question: Question;
  index: number;
  value: AnswerValue;
  error?: string;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}

/** Renders one survey question: prompt + required marker + the type-appropriate input + error. */
export function QuestionField({ question, index, value, error, onChange, disabled }: QuestionFieldProps) {
  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
        Question {index + 1}
        {question.isRequired && <span className="ml-1 text-[color:var(--color-error-500)]">*</span>}
      </p>
      <p className="mb-4 text-sm font-medium text-[color:var(--text-primary)]">{question.questionText}</p>

      {question.type === "SHORT_ANSWER" && (
        <ShortAnswerInput question={question} value={typeof value === "string" ? value : ""} onChange={onChange} disabled={disabled} />
      )}
      {question.type === "LONG_ANSWER" && (
        <LongAnswerInput question={question} value={typeof value === "string" ? value : ""} onChange={onChange} disabled={disabled} />
      )}
      {question.type === "LINEAR_SCALE" && (
        <LinearScaleInput question={question} value={typeof value === "number" ? value : null} onChange={onChange} disabled={disabled} />
      )}
      {question.type === "MULTIPLE_CHOICE" && (
        <MultipleChoiceInput question={question} value={typeof value === "string" ? value : ""} onChange={onChange} disabled={disabled} />
      )}
      {question.type === "CHECKBOX" && (
        <CheckboxInput question={question} value={Array.isArray(value) ? value : []} onChange={onChange} disabled={disabled} />
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--color-error-500)]">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}
