import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type {
  BulkOnboardingCommitResult,
  BulkOnboardingPreviewResult,
} from "../../types/onboarding.types";

interface BulkJobStatusProps {
  preview: BulkOnboardingPreviewResult | null;
  result: BulkOnboardingCommitResult | null;
  previewStale?: boolean;
  isChecking?: boolean;
}

type StatusTone = "success" | "warning" | "error";

const TONE_STYLES: Record<
  StatusTone,
  {
    container: string;
    icon: LucideIcon;
    iconClass: string;
    titleClass: string;
    bodyClass: string;
  }
> = {
  success: {
    container: "border-[color:var(--color-success-200)] bg-[color:var(--color-success-50)]",
    icon: CheckCircle2,
    iconClass: "text-[color:var(--color-success-600)]",
    titleClass: "text-[color:var(--color-success-700)]",
    bodyClass: "text-[color:var(--color-success-700)]",
  },
  warning: {
    container: "border-[color:var(--color-warning-200)] bg-[color:var(--color-warning-50)]",
    icon: AlertTriangle,
    iconClass: "text-[color:var(--color-warning-600)]",
    titleClass: "text-[color:var(--color-warning-700)]",
    bodyClass: "text-[color:var(--color-warning-700)]",
  },
  error: {
    container: "border-[color:var(--color-error-200)] bg-[color:var(--color-error-50)]",
    icon: AlertCircle,
    iconClass: "text-[color:var(--color-error-700)]",
    titleClass: "text-[color:var(--color-error-700)]",
    bodyClass: "text-[color:var(--color-error-900)]",
  },
};

function StatusBanner({
  tone,
  title,
  body,
  spinning = false,
}: {
  tone: StatusTone;
  title: string;
  body?: string;
  spinning?: boolean;
}) {
  const styles = TONE_STYLES[tone];
  const Icon = styles.icon;

  return (
    <div className={cn("rounded-lg border p-3", styles.container)} role="status">
      <div className="flex items-start gap-2">
        {spinning ? (
          <Loader2
            className={cn("mt-0.5 h-4 w-4 shrink-0 animate-spin", styles.iconClass)}
            aria-hidden="true"
          />
        ) : (
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.iconClass)} aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", styles.titleClass)}>{title}</p>
          {body ? <p className={cn("mt-1 text-xs", styles.bodyClass)}>{body}</p> : null}
        </div>
      </div>
    </div>
  );
}

function previewTone(preview: BulkOnboardingPreviewResult): StatusTone {
  if (preview.validRows === 0) return "error";
  if (preview.invalidRows > 0) return "warning";
  return "success";
}

function previewTitle(preview: BulkOnboardingPreviewResult): string {
  if (preview.validRows === 0) return "No rows are valid yet";
  if (preview.invalidRows > 0) {
    return `${preview.validRows} of ${preview.totalRows} rows are valid`;
  }
  return `All ${preview.totalRows} row${preview.totalRows === 1 ? "" : "s"} are valid`;
}

function previewBody(preview: BulkOnboardingPreviewResult): string | undefined {
  if (preview.validRows === 0) {
    return "Every row needs a fix before you can create anyone.";
  }
  if (preview.invalidRows > 0) {
    const flaggedCount = preview.invalidRows;
    return `Fix the ${flaggedCount} flagged row${flaggedCount === 1 ? "" : "s"}, or create the valid ones.`;
  }
  return undefined;
}

export function BulkJobStatus({
  preview,
  result,
  previewStale = false,
  isChecking = false,
}: BulkJobStatusProps) {
  if (result) {
    const hasInviteFailures = result.inviteFailures.length > 0;

    return (
      <StatusBanner
        tone={hasInviteFailures ? "warning" : "success"}
        title={`${result.created.length} onboarding record${result.created.length === 1 ? "" : "s"} created`}
        body={
          hasInviteFailures
            ? `${result.inviteFailures.length} invite email${
                result.inviteFailures.length === 1 ? "" : "s"
              } could not be delivered. Use Resend invite from each onboarding case.`
            : "Every new employee received an invite."
        }
        spinning={false}
      />
    );
  }

  if (!preview && !previewStale) return null;

  if (previewStale && !isChecking) {
    return (
      <StatusBanner
        tone="warning"
        title="Changes not checked yet"
        body="Click Check rows to validate your edits before creating employees."
      />
    );
  }

  if (isChecking) {
    return (
      <StatusBanner
        tone="warning"
        title="Checking rows"
        body="Looking for duplicates, supervisor matches, and other issues."
        spinning
      />
    );
  }

  if (!preview) return null;

  return (
    <StatusBanner
      tone={previewTone(preview)}
      title={previewTitle(preview)}
      body={previewBody(preview)}
    />
  );
}
