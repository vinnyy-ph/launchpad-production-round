import { cn } from "@/shared/lib/utils";
import type { OnboardingInvitationStatus } from "../types/onboarding.types";

const INVITE_LABELS: Record<OnboardingInvitationStatus, string> = {
  pending: "Invited",
  accepted: "Accepted",
  expired: "Expired",
  failed_delivery: "Delivery failed",
};

const INVITE_TONE_CLASS: Record<OnboardingInvitationStatus, string> = {
  pending: "bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]",
  accepted: "bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]",
  expired: "bg-[#FAFAFA] text-[color:var(--text-secondary)] border-[#E9EAEB]",
  failed_delivery: "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]",
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
