import { cn } from "@/shared/lib/utils";
import type { OnboardingInvitationStatus } from "../types/onboarding.types";

const INVITE_LABELS: Record<OnboardingInvitationStatus, string> = {
  pending: "Invited",
  accepted: "Accepted",
  expired: "Expired",
  failed_delivery: "Delivery failed",
};

const INVITE_TONE_CLASS: Record<OnboardingInvitationStatus, string> = {
  pending: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-700)] border-[color:var(--color-warning-200)]",
  accepted: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] border-[color:var(--color-success-200)]",
  expired: "bg-[color:var(--gray-neutral-50)] text-[color:var(--text-secondary)] border-[color:var(--gray-neutral-200)]",
  failed_delivery: "bg-[color:var(--color-error-50)] text-[color:var(--color-error-700)] border-[color:var(--color-error-200)]",
};

/** Invitation lifecycle badge for HR onboarding lists and detail views. */
export function InviteStatusBadge({
  status,
  dot = false,
}: {
  status: OnboardingInvitationStatus | null | undefined;
  dot?: boolean;
}) {
  if (!status) {
    return <span className="text-xs text-[color:var(--text-tertiary)]">Not sent</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] rounded-full border px-2 py-[3px] text-xs font-medium",
        INVITE_TONE_CLASS[status],
      )}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
          aria-hidden="true"
        />
      )}
      {INVITE_LABELS[status]}
    </span>
  );
}

export function inviteStatusLabel(status: OnboardingInvitationStatus | null | undefined): string {
  if (!status) return "Not sent";
  return INVITE_LABELS[status] ?? status;
}
