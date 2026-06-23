import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/shared/lib/utils";

export type ProgressStepStatus = "complete" | "current" | "upcoming";

export interface ProgressStepItem {
  label: string;
  description?: string;
  status: ProgressStepStatus;
  disabled?: boolean;
  onClick?: () => void;
}

export interface ProgressStepsProps {
  items: ProgressStepItem[];
  className?: string;
}

export function ProgressSteps({ items, className }: ProgressStepsProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol
        className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-[repeat(var(--step-count),minmax(0,1fr))]"
        style={{ "--step-count": items.length } as CSSProperties}
      >
        {items.map((item, index) => {
          const stepNumber = index + 1;
          const isLast = index === items.length - 1;
          const isComplete = item.status === "complete";
          const isCurrent = item.status === "current";
          const connectorActive = isComplete;

          return (
            <li
              key={`${item.label}-${stepNumber}`}
              className="relative min-w-0"
            >
              {!isLast && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute left-1/2 top-4 z-0 hidden h-0.5 w-full min-[640px]:block",
                    connectorActive ? "bg-gradient-jia-45" : "bg-[color:var(--border-primary)]",
                  )}
                />
              )}
              <button
                type="button"
                disabled={item.disabled}
                onClick={item.onClick}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group relative flex w-full min-w-0 items-start gap-3 rounded-lg text-left transition-opacity min-[640px]:flex-col min-[640px]:items-center min-[640px]:gap-2 min-[640px]:px-1",
                  item.disabled && "cursor-not-allowed opacity-45",
                )}
              >
                <span
                  className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold shadow-xs transition-colors",
                    isComplete && "border-[color:var(--gray-900)] bg-[color:var(--gray-900)] text-white",
                    isCurrent && "border-transparent text-white",
                    item.status === "upcoming" &&
                      "border-[color:var(--border-secondary)] bg-white text-[color:var(--text-tertiary)]",
                  )}
                  style={isCurrent ? { background: "var(--gradient-jia)" } : undefined}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                  ) : (
                    stepNumber
                  )}
                </span>
                <span className="min-w-0 pt-0.5 min-[640px]:pt-0">
                  <span
                    className={cn(
                      "block truncate text-sm font-semibold",
                      isCurrent || isComplete
                        ? "text-[color:var(--text-primary)]"
                        : "text-[color:var(--text-tertiary)]",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className="mt-0.5 block truncate text-xs text-[color:var(--text-tertiary)]">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
