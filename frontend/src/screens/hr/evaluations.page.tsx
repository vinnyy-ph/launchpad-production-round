"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ClipboardCheck, Search } from "lucide-react";
import { ScreenHeader } from "@/shared/components/layout/screen-header";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import {
  EmptyState,
  DataTable,
  FilterBar,
  StatusBadge,
  type Column,
  type DataTableSort,
} from "@/shared/ui/patterns";
import {
  useEvaluations,
  GRADE_LABELS,
  type Evaluation,
} from "@/modules/performance/evaluations";
import { ReviewEvaluationDialog } from "@/modules/performance/evaluations/components/review-evaluation-dialog";
import { formatPeriod } from "@/screens/supervisor/evaluations.format";
import { ACK_PRESENTATION, type AckStatus } from "@/modules/performance/evaluations/lib/ack-status";

const PAGE_SIZE = 10;
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "reviewee", label: "Reviewee" },
  { value: "reviewer", label: "Reviewer" },
  { value: "period", label: "Period" },
  { value: "grade", label: "Grade" },
  { value: "due", label: "Acknowledgement due" },
];

/** First + last initial of a name, for the reviewee avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const letters = (parts[0][0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "");
  return letters.toUpperCase() || "—";
}

/** A single date, absolute, with the year dropped when it falls in the current year. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, d.getFullYear() === new Date().getFullYear() ? "LLL d" : "LLL d, yyyy");
}

type AckTone = "warning" | "success" | "neutral";

/** Acknowledgement status: Pending / Acknowledged / Auto-acknowledged.
 *  State is derived here; label + tone come from the shared ACK_PRESENTATION map. */
function ackInfo(ev: Evaluation): { status: string; tone: AckTone } {
  const ack = ev.acknowledgement;
  const state: AckStatus =
    ack?.acknowledgedAt && !ack.isDeemedAck ? "acknowledged" : ack?.isDeemedAck ? "auto" : "pending";
  const { label, tone } = ACK_PRESENTATION[state];
  return { status: label, tone };
}

export default function HrEvaluationsPage() {
  const { data: allEvals, isLoading, isError, refetch } = useEvaluations();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<DataTableSort>({ key: "due", direction: "desc" });
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<Evaluation | null>(null);

  // HR sees every sent evaluation in the org — drafts (including HR's own) are excluded here.
  const sent = useMemo(() => (allEvals ?? []).filter((e) => e.isSent), [allEvals]);

  const revieweeName = (ev: Evaluation) => ev.reviewee?.fullName ?? "—";
  const reviewerName = (ev: Evaluation) => ev.reviewer?.fullName ?? "—";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sent;
    return sent.filter(
      (e) => revieweeName(e).toLowerCase().includes(q) || reviewerName(e).toLowerCase().includes(q),
    );
  }, [sent, search]);

  const sorted = useMemo(() => {
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "reviewee":
          return dir * revieweeName(a).localeCompare(revieweeName(b));
        case "reviewer":
          return dir * reviewerName(a).localeCompare(reviewerName(b));
        case "grade":
          return dir * (a.grade - b.grade);
        case "due": {
          const ta = a.ackDeadline ? new Date(a.ackDeadline).getTime() : Infinity;
          const tb = b.ackDeadline ? new Date(b.ackDeadline).getTime() : Infinity;
          return dir * (ta - tb);
        }
        case "period":
        default:
          return dir * (new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());
      }
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<Evaluation>[] = [
    {
      header: "Reviewee",
      className: "min-w-[220px]",
      sortable: true,
      sortKey: "reviewee",
      cell: (ev) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-[color:var(--text-primary)]"
            style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
          >
            {initials(revieweeName(ev))}
          </span>
          <p className="min-w-0 truncate text-sm font-medium text-[color:var(--text-primary)]">
            {revieweeName(ev)}
          </p>
        </div>
      ),
    },
    {
      header: "Reviewer",
      className: "min-w-[180px]",
      sortable: true,
      sortKey: "reviewer",
      cell: (ev) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{reviewerName(ev)}</span>
      ),
    },
    {
      header: "Period",
      className: "min-w-[150px] whitespace-nowrap",
      sortable: true,
      sortKey: "period",
      cell: (ev) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {formatPeriod(ev.periodStart, ev.periodEnd)}
        </span>
      ),
    },
    {
      header: "Grade",
      className: "min-w-[140px] text-right tabular-nums whitespace-nowrap",
      sortable: true,
      sortKey: "grade",
      cell: (ev) => (
        <div>
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">{ev.grade}</span>
          <span className="ml-1.5 hidden text-xs text-[color:var(--text-tertiary)] md:inline">
            {GRADE_LABELS[ev.grade]}
          </span>
        </div>
      ),
    },
    {
      header: "Acknowledgement",
      mobileLabel: "Acknowledgement",
      className: "min-w-[150px]",
      cell: (ev) => {
        const ack = ackInfo(ev);
        return <StatusBadge status={ack.status} tone={ack.tone} />;
      },
    },
    {
      header: "Acknowledgement due",
      mobileLabel: "Acknowledgement due",
      className: "min-w-[160px] whitespace-nowrap",
      sortable: true,
      sortKey: "due",
      cell: (ev) =>
        ev.ackDeadline ? (
          <span className="text-sm text-[color:var(--text-secondary)]">
            {formatDate(ev.ackDeadline)}
          </span>
        ) : (
          <span className="text-xs text-[color:var(--text-quaternary)]">—</span>
        ),
    },
  ];

  const hasSearch = Boolean(search.trim());

  return (
    <div className="min-w-0">
      <ScreenHeader id="hr-evaluations" level="page" />

      <FilterBar aria-label="Filter evaluations" className="gap-3">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-[320px]">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]"
            />
            <Input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by reviewee or reviewer"
              aria-label="Search evaluations"
              className="w-full pl-9"
            />
          </div>
          <div className="flex w-full gap-2 md:hidden">
            <Select
              value={sort.key}
              onValueChange={(v: string) => setSort((s) => ({ key: v, direction: s.direction }))}
            >
              <SelectTrigger className="w-full min-w-0" aria-label="Sort by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterBar>

      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <DataTable
          columns={columns}
          data={pageItems}
          isLoading={isLoading}
          error={isError ? "Could not load evaluations." : null}
          onRetry={() => void refetch()}
          getRowId={(ev) => ev.id}
          onRowClick={(ev) => setReviewing(ev)}
          sort={sort}
          onSortChange={setSort}
          pagination={{ page, totalPages, onPageChange: setPage }}
          emptyState={
            <EmptyState
              icon={ClipboardCheck}
              title={hasSearch ? "No matching evaluations" : "No sent evaluations yet"}
              body={
                hasSearch
                  ? "Try a different search."
                  : "Sent performance evaluations across the organization will appear here."
              }
              action={hasSearch ? { label: "Clear search", onClick: () => setSearch("") } : undefined}
            />
          }
        />
      </div>

      <ReviewEvaluationDialog
        open={!!reviewing}
        evaluation={reviewing}
        onClose={() => setReviewing(null)}
        readOnly
      />
    </div>
  );
}
