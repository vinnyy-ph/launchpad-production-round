"use client";

import { useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button, Textarea, Input, Skeleton } from "@/shared/ui";
import { ApiError } from "@/shared/lib/api-client";
import { useGenerateAiQuestions } from "../hooks/use-generate-ai-questions";
import type { GeneratedQuestion } from "../types/surveys.types";

const COUNT_MIN = 1;
const COUNT_MAX = 10;
const DEFAULT_COUNT = 5;

interface AiQuestionGeneratorPanelProps {
  onGenerated: (questions: GeneratedQuestion[]) => void;
  disabled?: boolean;
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COUNT;
  return Math.min(COUNT_MAX, Math.max(COUNT_MIN, Math.round(value)));
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 422) {
    return "Couldn't generate valid questions — try rephrasing your goal.";
  }
  return "AI is unavailable right now. Please try again later.";
}

export function AiQuestionGeneratorPanel({ onGenerated, disabled }: AiQuestionGeneratorPanelProps) {
  const [goal, setGoal] = useState("");
  const [count, setCount] = useState(DEFAULT_COUNT);
  const mutation = useGenerateAiQuestions();

  const trimmedGoal = goal.trim();
  const canGenerate = trimmedGoal.length > 0 && !disabled && !mutation.isPending;

  const handleGenerate = () => {
    if (!canGenerate) return;
    mutation.mutate(
      { goal: trimmedGoal, count: clampCount(count) },
      { onSuccess: (questions) => onGenerated(questions) },
    );
  };

  return (
    <div className="rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 shadow-[0_1px_3px_-1px_rgba(16,18,24,0.07),0_7px_16px_-6px_rgba(16,18,24,0.11)]">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-[color:var(--brand-blue)]" />
        <h3 className="text-[15px] font-semibold text-[color:var(--text-primary)]">
          Generate questions with AI
        </h3>
      </div>
      <p className="mt-1 text-[13px] text-[color:var(--text-tertiary)]">
        Describe your goal and we&apos;ll draft questions you can edit before saving.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <Textarea
            id="ai-survey-goal"
            aria-label="Survey goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Measure how supported new hires feel in their first 30 days"
            rows={3}
            disabled={disabled || mutation.isPending}
          />
        </div>

        <div className="flex items-end gap-3">
          <div className="w-28">
            <label
              htmlFor="ai-question-count"
              className="mb-1 block text-[12px] font-medium text-[color:var(--text-secondary)]"
            >
              How many?
            </label>
            <Input
              id="ai-question-count"
              type="number"
              min={COUNT_MIN}
              max={COUNT_MAX}
              value={count}
              onChange={(e) => setCount(clampCount(Number(e.target.value)))}
              disabled={disabled || mutation.isPending}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={handleGenerate} disabled={!canGenerate}>
            <Sparkles size={15} className="text-[color:var(--brand-blue)]" />
            Generate questions
          </Button>
        </div>
      </div>

      {mutation.isPending && (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      )}

      {mutation.isError && !mutation.isPending && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
            {errorMessage(mutation.error)}
          </span>
          <button
            type="button"
            onClick={handleGenerate}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
