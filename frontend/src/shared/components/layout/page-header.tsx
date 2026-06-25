import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional right-aligned action (e.g. a primary button). */
  action?: ReactNode;
  /**
   * Heading scale. `"default"` (24px / display-xs) for secondary pages; `"page"`
   * bumps the h1 to display-sm (30px / 38px lh) for primary list-master pages.
   */
  level?: "default" | "page";
}

/**
 * Shared page title for app screens: title + optional subtitle on the left,
 * optional action on the right. Stacks on mobile. Bold display title (Jia display
 * scale) over a 16px text-md subtitle in text-tertiary, 4px apart.
 */
export function PageHeader({ title, subtitle, action, level = "default" }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1
          className={cn(
            "truncate font-bold tracking-[-0.02em] text-[color:var(--text-primary)]",
            level === "page" ? "text-[30px] leading-[38px]" : "text-2xl",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-base text-[color:var(--text-tertiary)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
