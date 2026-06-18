import type { ElementType } from "react";
import { ChevronUp, ChevronDown, Info } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/primitives/tooltip";

export interface KpiCardProps {
  label: string;
  value: string | number;
  /** Small icon shown in the gray chip beside the label (Lucide or Untitled UI). */
  icon?: ElementType;
  /** Sub-line under the label, e.g. "This month". */
  period?: string;
  /** Optional info-icon tooltip next to the label. */
  hint?: string;
  /** Trend pill — up = green, down = red (e.g. { value: "12%", direction: "up" }). */
  delta?: { value: string; direction: "up" | "down" };
  /** Render the value as a skeleton while data loads. */
  loading?: boolean;
}

/**
 * Dashboard KPI card — mirrors the Jia UI-kit metric card: gray icon chip + label,
 * a period sub-line, a 40px value, and an optional green/red trend pill.
 */
export function KpiCard({ label, value, icon: Icon, period, hint, delta, loading = false }: KpiCardProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white px-5 py-[18px]"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[5px] bg-[color:var(--gray-100)]">
            <Icon size={12} className="text-[color:var(--text-secondary)]" />
          </span>
        )}
        <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-[color:var(--text-primary)]">
          {label}
        </span>
        {hint && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${label}`}
                  className="rounded-sm text-[color:var(--text-tertiary)] outline-none transition-colors hover:text-[color:var(--text-secondary)] focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Info className="h-[13px] w-[13px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-center">
                {hint}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {period && (
        <p className="mt-1 text-[12px] font-medium text-[color:var(--text-tertiary)]">{period}</p>
      )}

      {loading ? (
        <Skeleton className="mt-3.5 h-10 w-16" />
      ) : (
        <p className="mt-3.5 text-[40px] font-bold leading-none tracking-[-0.025em] text-[color:var(--text-primary)]">
          {value}
        </p>
      )}

      {delta && !loading && (
        <div className="mt-2.5 flex items-center gap-2 text-[12.5px] font-medium text-[color:var(--text-secondary)]">
          <span
            className={cn(
              "inline-flex items-center gap-[3px] rounded-full py-0.5 pl-[5px] pr-[7px] text-[11.5px] font-semibold",
              delta.direction === "up" ? "bg-[#ECFDF3] text-[#067647]" : "bg-[#FEF3F2] text-[#B42318]",
            )}
          >
            {delta.direction === "up" ? (
              <ChevronUp className="h-[11px] w-[11px]" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="h-[11px] w-[11px]" strokeWidth={2.5} />
            )}
            {delta.value}
          </span>
          compared to last month
        </div>
      )}
    </div>
  );
}
