import { cn } from "@/shared/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "default" | "warn" | "alert" | "brand";
  /** Optional trend line, e.g. "+12% vs last cycle". */
  delta?: string;
}

export function StatCard({ label, value, variant = "default", delta }: StatCardProps) {
  const color =
    variant === "alert" ? "var(--color-error-600)"
    : variant === "warn" ? "var(--color-warning-600)"
    : "var(--text-primary)";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white p-4",
        variant === "brand" &&
          "before:absolute before:left-0 before:top-0 before:h-full before:w-[6px] before:bg-gradient-jia",
      )}
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <p className="text-2xl font-bold tracking-[-0.02em]" style={{ color }}>{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">{label}</p>
      {delta && <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">{delta}</p>}
    </div>
  );
}
