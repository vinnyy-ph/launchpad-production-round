export interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "default" | "warn" | "alert";
}

export function StatCard({ label, value, variant = "default" }: StatCardProps) {
  const color =
    variant === "alert" ? "var(--color-error-600)"
    : variant === "warn" ? "var(--color-warning-600)"
    : "var(--text-primary)";
  return (
    <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4" style={{ boxShadow: "var(--shadow-xs)" }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">{label}</p>
    </div>
  );
}
