import type { ElementType } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, Info, ArrowUpRight } from "lucide-react";
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
  /** Optional 0–100 progress bar rendered as a thin track under the value. */
  progress?: number;
  /** Render the value as a skeleton while data loads. */
  loading?: boolean;
  /** When set, the whole card becomes a link to this route, with a hover affordance. */
  href?: string;
}

/**
 * Dashboard KPI card — mirrors the Jia UI-kit metric card: gray icon chip + label,
 * a period sub-line, a 40px value, and an optional green/red trend pill. Pass `href`
 * to make the whole card a link to where the metric is acted on.
 */
export function KpiCard({ label, value, icon: Icon, period, hint, delta, progress, loading = false, href }: KpiCardProps) {
  const interactive = !!href;
  const className = cn(
    "relative block overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white px-5 py-[18px]",
    interactive &&
      "group transition-colors hover:border-[color:var(--border-secondary)]",
  );
  const body = (
    <>
      {interactive && (
        <ArrowUpRight
          aria-hidden="true"
          className="absolute right-4 top-4 h-4 w-4 text-[color:var(--text-quaternary)] opacity-0 transition-opacity group-hover:opacity-100"
        />
      )}
      <div className="flex min-h-[40px] items-start gap-2">
        {Icon && (
          <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--gray-100)]">
            <Icon size={15} className="text-[color:var(--text-secondary)]" />
          </span>
        )}
        <span className="text-[14px] font-semibold tracking-[-0.01em] text-[color:var(--text-primary)]">
          {label}
        </span>
        {hint && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${label}`}
                  className="rounded-sm text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-secondary)]"
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

      {loading ? (
        <Skeleton className="mt-3.5 h-10 w-16" />
      ) : (
        <p className="mt-3.5 text-[36px] font-bold leading-none tracking-[-0.025em] text-[color:var(--text-primary)]">
          {value}
        </p>
      )}

      {/* Caption sits BELOW the value so a present/absent period never shifts where the number
          lands — keeps the big numbers aligned across a row of cards. */}
      {period && !loading && (
        <p className="mt-1.5 text-[12px] font-medium text-[color:var(--text-tertiary)]">{period}</p>
      )}

      {progress != null && !loading && (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--bg-tertiary)]"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: "hsl(var(--chart-1))" }}
          />
        </div>
      )}

      {delta && !loading && (
        <div className="mt-2.5 flex items-center gap-2 text-[12px] font-medium text-[color:var(--text-secondary)]">
          <span
            className={cn(
              "inline-flex items-center gap-[3px] rounded-full py-0.5 pl-[5px] pr-[7px] text-[12px] font-semibold",
              delta.direction === "up" ? "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]" : "bg-[color:var(--color-error-50)] text-[color:var(--color-error-700)]",
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
    </>
  );

  if (interactive) {
    return (
      <Link href={href!} className={className} style={{ boxShadow: "var(--shadow-xs)" }}>
        {body}
      </Link>
    );
  }
  return (
    <div className={className} style={{ boxShadow: "var(--shadow-xs)" }}>
      {body}
    </div>
  );
}
