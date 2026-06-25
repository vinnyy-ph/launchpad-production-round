import * as React from "react";
import { cn } from "@/shared/lib/utils";

export function FilterBar({
  children,
  className,
  contained = false,
  "aria-label": ariaLabel = "Filters",
}: {
  children: React.ReactNode;
  className?: string;
  /** Wrap the bar in a subtle card surface (border + secondary bg). */
  contained?: boolean;
  "aria-label"?: string;
}) {
  return (
    <div
      role="search"
      aria-label={ariaLabel}
      className={cn(
        "mb-4 flex flex-col gap-2 sm:flex-row sm:items-center",
        contained &&
          "rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-3 py-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
