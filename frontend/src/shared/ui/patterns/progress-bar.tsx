import { cn } from "@/shared/lib/utils";

export interface ProgressBarProps {
  /** Percent complete, 0–100. Clamped to that range. */
  value: number;
  label?: string;
  /** Right-aligned counter shown next to the label, e.g. "5 of 8". */
  counter?: string;
  className?: string;
}

/**
 * The one place the brand gradient is used as an interactive fill — it marks
 * advancement, not an action. Brandbook → Components → Progress.
 */
export function ProgressBar({ value, label, counter, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || counter) && (
        <div className="flex items-center justify-between gap-2">
          {label && <span className="text-[14px] font-bold text-[color:var(--text-primary)]">{label}</span>}
          {counter && <span className="text-[14px] text-[color:var(--text-tertiary)]">{counter}</span>}
        </div>
      )}
      <div
        className="h-[6px] overflow-hidden rounded-[10px] bg-[color:var(--gray-200)]"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-[10px] bg-gradient-jia-45" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
