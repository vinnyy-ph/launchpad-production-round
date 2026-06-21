import { AlertCircle, CheckCircle2, MailWarning } from "lucide-react";
import type {
  BulkOnboardingCommitResult,
  BulkOnboardingPreviewResult,
} from "../../types/onboarding.types";

interface BulkJobStatusProps {
  preview: BulkOnboardingPreviewResult | null;
  result: BulkOnboardingCommitResult | null;
}

export function BulkJobStatus({ preview, result }: BulkJobStatusProps) {
  if (result) {
    const hasInviteFailures = result.inviteFailures.length > 0;

    return (
      <div className="rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3">
        <div className="flex items-start gap-2">
          {hasInviteFailures ? (
            <MailWarning className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
          )}
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              {result.created.length} onboarding records created
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
              {hasInviteFailures
                ? `${result.inviteFailures.length} invite email${
                    result.inviteFailures.length === 1 ? "" : "s"
                  } could not be delivered. Use Resend invite from each onboarding case.`
                : "Every new employee received an invite."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const hasErrors = preview.errors.length > 0;

  return (
    <div className="rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3">
      <div className="flex items-start gap-2">
        {hasErrors ? (
          <AlertCircle className="mt-0.5 h-4 w-4 text-[#B42318]" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
        )}
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
            {preview.validRows} valid / {preview.totalRows} total rows
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
            {hasErrors
              ? "Fix the flagged rows in the spreadsheet, then upload it again."
              : "No row errors found. You can commit this upload."}
          </p>
        </div>
      </div>
    </div>
  );
}
