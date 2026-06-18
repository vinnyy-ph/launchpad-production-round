import { Info } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/primitives/tooltip";

export interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "default" | "warn" | "alert" | "brand";
  /** Optional trend line, e.g. "+12% vs last cycle". */
  delta?: string;
  /** Optional helper text shown via an info-icon tooltip next to the label. */
  hint?: string;
}

export function StatCard({ label, value, variant = "default", delta, hint }: StatCardProps) {
  const color =
    variant === "alert" ? "var(--color-error-600)"
    : variant === "warn" ? "var(--color-warning-600)"
    : "var(--text-primary)";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white p-4",
        variant === "brand"
          ? "border-[color:var(--border-secondary)]"
          : "border-[color:var(--border-primary)]",
      )}
      style={{ boxShadow: variant === "brand" ? "var(--shadow-inset-brand)" : "var(--shadow-xs)" }}
    >
      <p className="text-2xl font-bold tracking-[-0.02em]" style={{ color }}>{value}</p>
      <div className="mt-1 flex items-center gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">{label}</p>
        {hint && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${label}`}
                  className="rounded-sm text-[color:var(--text-quaternary)] outline-none transition-colors hover:text-[color:var(--text-secondary)] focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-center normal-case">
                {hint}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {delta && <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">{delta}</p>}
    </div>
  );
}
