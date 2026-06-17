import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

interface ActionConfig {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
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
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        {body && <p className="text-sm text-muted-foreground">{body}</p>}
      </div>
      {action &&
        (isActionConfig(action) ? (
          <Button className="mt-1" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : (
          action
        ))}
    </div>
  );
}
