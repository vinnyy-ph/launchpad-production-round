import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface PageSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** "page" for a primary section heading (22px), "section" for a sub-section label (14px). */
  level?: "page" | "section";
  children: React.ReactNode;
}

export function PageSection({ title, description, action, level = "section", children }: PageSectionProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2
            className={cn(
              "text-[color:var(--text-primary)]",
              level === "page" ? "text-[22px] font-bold tracking-tight" : "text-sm font-bold",
            )}
          >
            {title}
          </h2>
          {description && <p className="text-xs text-[color:var(--text-tertiary)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
