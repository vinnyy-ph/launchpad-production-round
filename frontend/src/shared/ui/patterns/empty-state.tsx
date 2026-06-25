import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/lib/utils";

interface ActionConfig {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  /** Optional — Jia's empty states are often text + CTA with no icon. When given, it
   *  renders in the DS FeaturedIcon-style neutral circle. */
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ActionConfig | ReactNode;
  className?: string;
}

function isActionConfig(a: EmptyStateProps["action"]): a is ActionConfig {
  return typeof a === "object" && a !== null && "label" in a && "onClick" in a;
}

export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--gray-neutral-100)] text-[color:var(--text-tertiary)]">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <div className="space-y-1.5">
        <p className="text-xl font-bold tracking-tight text-[color:var(--text-primary)]">{title}</p>
        {body && (
          <p className="mx-auto max-w-sm text-sm text-[color:var(--text-tertiary)]">{body}</p>
        )}
      </div>
      {action &&
        (isActionConfig(action) ? (
          <Button className="mt-2" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : (
          action
        ))}
    </div>
  );
}
