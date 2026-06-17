import * as React from "react";

export interface PageSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function PageSection({ title, description, action, children }: PageSectionProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[color:var(--text-primary)]">{title}</h2>
          {description && <p className="text-xs text-[color:var(--text-tertiary)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
