import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional right-aligned action (e.g. a primary button). */
  action?: ReactNode;
}

/**
 * Shared page title for app screens: title + optional subtitle on the left,
 * optional action on the right. Stacks on mobile. Jia display scale, tokenized.
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
