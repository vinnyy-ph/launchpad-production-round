import { cn } from "@/shared/lib/utils";

type Tone = "neutral" | "success" | "warning" | "error" | "info";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  success: "bg-[var(--color-success-50)] text-[var(--color-success-600)]",
  warning: "bg-[var(--color-warning-50)] text-[var(--color-warning-600)]",
  error: "bg-[var(--color-error-50)] text-[var(--color-error-600)]",
  // No brand "info" token yet — alias to neutral until one exists.
  info: "bg-secondary text-secondary-foreground",
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
  className,
}: {
  status: string;
  tone?: Tone;
  className?: string;
}) {
  const key = typeof status === "string" ? status.toUpperCase() : "";
  const resolved = tone ?? STATUS_TONE[key] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[resolved],
        className,
      )}
    >
      {toSentenceCase(status)}
    </span>
  );
}
