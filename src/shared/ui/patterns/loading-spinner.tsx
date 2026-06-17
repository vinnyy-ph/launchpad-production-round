import { Loader2 } from "lucide-react";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { cn } from "@/shared/lib/utils";

/**
 * Inline / button-level loading affordance ONLY.
 * Full-surface waits must use a layout-matching skeleton (see `PageSkeleton`),
 * never a spinner — the brandbook calls for skeleton shimmer on full surfaces.
 */
export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <Loader2
      className={cn("animate-spin text-muted-foreground", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonRows({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-9 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Full-surface loading skeleton — a header bar plus two card-row blocks that
 * match the shape of a typical page. Use this for page-level async waits
 * instead of `Spinner`.
 */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} aria-hidden="true">
      <div className="h-7 w-1/3 rounded-md bg-[color:var(--gray-100)]" />
      {Array.from({ length: 2 }).map((_, r) => (
        <div
          key={r}
          className="space-y-2 rounded-xl border border-[color:var(--border-primary)] p-4"
        >
          <div className="h-4 w-1/2 rounded bg-[color:var(--gray-100)]" />
          <div className="h-4 w-full rounded bg-[color:var(--gray-100)]" />
          <div className="h-4 w-2/3 rounded bg-[color:var(--gray-100)]" />
        </div>
      ))}
    </div>
  );
}
