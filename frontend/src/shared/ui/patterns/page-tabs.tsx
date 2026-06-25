import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface PageTabItem {
  value: string;
  label: string;
  /** Optional count badge shown beside the label. */
  count?: number;
  /** Optional leading icon (lucide) — for distinct section/view tabs. */
  icon?: LucideIcon;
}

interface PageTabsProps {
  items: PageTabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  /** Optional actions aligned to the right on the same row as the tabs. */
  actions?: ReactNode;
}

/**
 * Underlined page-level tabs with an optional leading icon + count badge and a --gradient-jia
 * active indicator that slides between tabs (framer-motion shared layout, DS ease-standard, no
 * bounce; honours reduced-motion via the app's MotionConfig). Shared across list-master screens
 * so segmentation stays consistent. Optional right-aligned `actions` sit on the same row.
 */
export function PageTabs({ items, value, onChange, ariaLabel, actions }: PageTabsProps) {
  // Unique per instance so multiple tab bars on a page don't share one sliding indicator.
  const indicatorId = useId();
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b border-[color:var(--border-primary)]">
      <div
        role="tablist"
        aria-label={ariaLabel}
        // items-stretch so every tab fills the row height — the active underline then sits on the
        // divider regardless of whether a tab carries a (taller) count badge.
        className="flex min-w-0 flex-1 items-stretch gap-6 overflow-x-auto overflow-y-hidden scrollbar-none"
      >
        {items.map((item) => {
          const isActive = item.value === value;
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.value)}
              className={cn(
                "relative flex items-center gap-2 whitespace-nowrap rounded-md px-1 pb-3 pt-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                isActive
                  ? "text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]",
              )}
            >
              {Icon && <Icon size={16} aria-hidden="true" className="shrink-0" />}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    "inline-flex min-w-[20px] items-center justify-center rounded-full border bg-[color:var(--gray-neutral-100)] px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                    isActive
                      ? "border-[color:var(--border-primary)] text-[color:var(--text-secondary)]"
                      : "border-transparent text-[color:var(--text-tertiary)]",
                  )}
                >
                  {item.count}
                </span>
              )}
              {isActive && (
                <motion.span
                  layoutId={indicatorId}
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                  style={{ background: "var(--gradient-jia)" }}
                  transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2 pb-2.5">{actions}</div>
      ) : null}
    </div>
  );
}
