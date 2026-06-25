"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Users, ArrowUpRight } from "lucide-react";
import { UserAvatar, Skeleton, Badge } from "@/shared/ui";
import { EmptyState } from "@/shared/ui/patterns";
import type { BadgeProps } from "@/shared/ui/primitives/badge";
import type {
  ReportSnapshot as ReportSnapshotModel,
  ReportAckState,
} from "@/screens/supervisor/overview.logic";

/** First + last initial, for the gradient fallback avatar (mirrors the roster + evaluations tables). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

function reviewedLabel(iso: string | null): string {
  if (!iso) return "Not evaluated";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `Reviewed ${format(d, sameYear ? "LLL d" : "LLL d, yyyy")}`;
}

/** Grade → badge variant: 4–5 success, 3 modern, 2 warning, 1 error. */
function gradeVariant(grade: number): BadgeProps["variant"] {
  if (grade >= 4) return "success";
  if (grade === 3) return "modern";
  if (grade === 2) return "warning";
  return "error";
}

const ACK_BADGE: Record<ReportAckState, { label: string; variant: BadgeProps["variant"] }> = {
  ACKNOWLEDGED: { label: "Acknowledged", variant: "success" },
  AUTO_ACKNOWLEDGED: { label: "Auto-acknowledged", variant: "neutral" },
  PENDING: { label: "Pending", variant: "warning" },
  NONE: { label: "Not evaluated", variant: "neutral" },
};

function SnapshotRow({ s }: { s: ReportSnapshotModel }) {
  const ack = ACK_BADGE[s.ackState];
  return (
    <Link
      href={s.action.href}
      className="group flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 transition-colors hover:bg-[color:var(--bg-secondary)] sm:flex-nowrap"
    >
      <UserAvatar
        src={null}
        fallback={initials(s.name)}
        className="h-9 w-9 flex-none"
        fallbackClassName="text-xs font-bold text-white"
        fallbackStyle={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">{s.name}</p>
        <p className="truncate text-xs text-[color:var(--text-tertiary)]">{s.jobTitle ?? "—"}</p>
      </div>
      <div className="flex flex-none items-center gap-2">
        {s.latestGrade != null ? (
          <Badge variant={gradeVariant(s.latestGrade)} size="sm" pill title={s.latestGradeLabel ?? undefined}>
            {s.latestGrade} · {s.latestGradeLabel}
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm" pill>
            No grade
          </Badge>
        )}
        <Badge variant={ack.variant} size="sm" pill>
          {ack.label}
        </Badge>
      </div>
      <div className="flex flex-none items-center gap-3">
        <span className="hidden text-xs text-[color:var(--text-tertiary)] sm:inline">{reviewedLabel(s.lastReviewedAt)}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--text-secondary)]">
          {s.action.label}
          <ArrowUpRight size={13} className="text-[color:var(--text-quaternary)] transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** Latest-state, action-first performance row per direct report, ordered needs-attention-first. */
export function ReportSnapshot({ snapshots, loading }: { snapshots: ReportSnapshotModel[]; loading: boolean }) {
  if (loading) {
    return (
      <div
        className="divide-y divide-[color:var(--border-secondary)] overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No direct reports yet"
        body="People who report to you will appear here with their latest evaluation and acknowledgement status."
      />
    );
  }

  return (
    <div
      className="divide-y divide-[color:var(--border-secondary)] overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      {snapshots.map((s) => (
        <SnapshotRow key={s.id} s={s} />
      ))}
    </div>
  );
}
