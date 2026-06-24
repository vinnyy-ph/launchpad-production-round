import { cn } from "@/shared/lib/utils";

type Tone = "neutral" | "success" | "warning" | "error" | "brand" | "info";
type Shape = "default" | "pill" | "modern";

// Exact brandbook .badge colorways (match Badge primitive 1:1).
const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-[color:var(--gray-neutral-50)] text-[color:var(--text-secondary)] border-[color:var(--gray-neutral-200)]",
  success: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] border-[color:var(--color-success-200)]",
  warning: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-700)] border-[color:var(--color-warning-200)]",
  error: "bg-[color:var(--color-error-50)] text-[color:var(--color-error-700)] border-[color:var(--color-error-200)]",
  brand: "bg-[#EEF4FF] text-[#3538CD] border-[#C7D7FE]",
  // "info" is an alias kept for back-compat — maps to the brand colorway.
  info: "bg-[#EEF4FF] text-[#3538CD] border-[#C7D7FE]",
};

const SHAPE_CLASS: Record<Shape, string> = {
  default: "rounded-sm",
  pill: "rounded-full",
  modern: "rounded-full bg-white text-[color:var(--text-secondary)] border-[color:var(--gray-neutral-300)]",
};

// Enum-backed literals (authoritative) + derived literals (no producer yet).
const STATUS_TONE: Record<string, Tone> = {
  // EmployeeStatus
  ACTIVE: "success",
  ONBOARDING: "warning",
  OFFBOARDING: "info",
  INACTIVE: "error",
  // OffboardingStatus
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  // DocumentStatus
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  // SignatoryStatus
  SIGNED: "success",
  // InviteStatus
  ACCEPTED: "success",
  EXPIRED: "neutral",
  FAILED_DELIVERY: "error",
  // Derived (forward-looking; caller translates bool/date -> literal)
  DRAFT: "warning",
  SENT: "info",
  ACKNOWLEDGED: "success",
  DEEMED_ACK: "info",
  OVERDUE: "error",
};

function toSentenceCase(s: string): string {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function StatusBadge({
  status,
  tone,
  dot = false,
  shape = "pill",
  className,
}: {
  status: string;
  tone?: Tone;
  dot?: boolean;
  shape?: Shape;
  className?: string;
}) {
  const key = typeof status === "string" ? status.toUpperCase() : "";
  const resolved = tone ?? STATUS_TONE[key] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] border px-2 py-[3px] text-xs font-medium",
        TONE_CLASS[resolved],
        SHAPE_CLASS[shape],
        className,
      )}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {toSentenceCase(status)}
    </span>
  );
}
