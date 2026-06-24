"use client";

import { useState } from "react";
import { AlertCircle, ChevronRight, Users } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
  SearchInput,
} from "@/shared/ui";
import { useOccurrenceRespondents } from "../../hooks/use-occurrence-respondents";
import { useRespondentAnswers } from "../../hooks/use-respondent-answers";
import { AnswerValue } from "../my-answers-dialog";
import type { RespondentRosterMember } from "../../types/surveys.types";

function fmtDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

/** Read-only view of one named respondent's answers, opened from the drill-down list. */
function RespondentAnswersDialog({
  occurrenceId,
  member,
  onClose,
}: {
  occurrenceId: string;
  member: RespondentRosterMember | null;
  onClose: () => void;
}) {
  const open = !!member;
  const { data, isLoading, isError, refetch } = useRespondentAnswers(
    open ? occurrenceId : null,
    open ? (member?.employeeId ?? null) : null,
  );

  const name = member?.name || "This person";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-[color:var(--border-primary)] px-6 pb-4 pt-6 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight">{name}</DialogTitle>
          <DialogDescription>
            {data?.submitted && data.submittedAt
              ? `Responded ${fmtDateTime(data.submittedAt)}`
              : "Individual responses"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 pt-4">
          {isLoading && (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div key={i}>
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
              <AlertCircle
                size={16}
                className="flex-shrink-0 text-[color:var(--color-error-500)]"
              />
              <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
                Could not load these answers.
              </span>
              <button
                onClick={() => void refetch()}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
              >
                Retry
              </button>
            </div>
          )}

          {data && !data.submitted && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[color:var(--border-primary)] bg-white px-4 py-3 text-[14px] text-[color:var(--text-secondary)]">
              <AlertCircle
                size={17}
                className="mt-0.5 flex-none text-[color:var(--text-tertiary)]"
                aria-hidden="true"
              />
              <span>{name} hasn&apos;t responded to this pulse yet.</span>
            </div>
          )}

          {data &&
            data.submitted &&
            data.answers.map((a) => (
              <div key={a.questionId}>
                <p className="mb-1.5 text-sm font-semibold text-[color:var(--text-primary)]">
                  {a.questionText}
                </p>
                <AnswerValue a={a} />
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Authority-gated individual drill-down for NAMED surveys. The server returns an empty roster
 * for anonymous surveys and for viewers without individual-view authority, so this renders
 * nothing unless the viewer (HR/root → everyone; supervisor → their downward chain) actually
 * has people to drill into.
 */
const PAGE_SIZE = 10;

export function RespondentsDrilldown({
  occurrenceId,
  isAnonymous,
}: {
  occurrenceId?: string;
  isAnonymous: boolean;
}) {
  const [selected, setSelected] = useState<RespondentRosterMember | null>(null);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Never fetch (or render) for anonymous surveys — individuals are never exposed.
  const { data, isLoading } = useOccurrenceRespondents(
    isAnonymous || !occurrenceId ? null : occurrenceId,
  );
  const respondents = data?.respondents ?? [];

  // Anonymous / no occurrence → never show. Loaded-but-empty (no authority) → also nothing.
  if (isAnonymous || !occurrenceId) return null;

  if (isLoading) {
    return (
      <div
        className="mt-4 rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 shadow-[0_1px_3px_-1px_rgba(16,18,24,0.07),0_7px_16px_-6px_rgba(16,18,24,0.11)] sm:p-6"
        aria-busy="true"
      >
        <div className="mb-4 flex items-center gap-2.5">
          <Users size={16} className="text-[color:var(--text-tertiary)]" aria-hidden="true" />
          <h3 className="text-[16px] font-bold tracking-tight text-[color:var(--text-primary)]">
            Individual responses
          </h3>
        </div>
        <ul className="divide-y divide-[color:var(--border-secondary)]">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (respondents.length === 0) return null;

  const respondedCount = respondents.filter((r) => r.submitted).length;

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? respondents.filter((r) => (r.name || "").toLowerCase().includes(trimmed))
    : respondents;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="mt-4 rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 shadow-[0_1px_3px_-1px_rgba(16,18,24,0.07),0_7px_16px_-6px_rgba(16,18,24,0.11)] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <Users size={16} className="text-[color:var(--text-tertiary)]" aria-hidden="true" />
        <h3 className="text-[16px] font-bold tracking-tight text-[color:var(--text-primary)]">
          Individual responses
        </h3>
        <span className="text-[12px] text-[color:var(--text-quaternary)]">
          {respondedCount} of {respondents.length} responded
        </span>
      </div>

      <div className="mb-3">
        <SearchInput
          value={query}
          onValueChange={handleQueryChange}
          placeholder="Search by name"
          aria-label="Search respondents by name"
        />
      </div>

      {trimmed && (
        <p className="mb-2.5 text-[12px] text-[color:var(--text-quaternary)]">
          Showing {filtered.length} of {respondents.length}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-[14px] text-[color:var(--text-tertiary)]">
          No one matches &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-[color:var(--border-secondary)]">
            {visible.map((r) => (
              <li key={r.employeeId}>
                <button
                  type="button"
                  onClick={() => r.submitted && setSelected(r)}
                  disabled={!r.submitted}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left enabled:hover:opacity-80 disabled:cursor-default"
                >
                  <span className="truncate text-[14px] text-[color:var(--text-primary)]">
                    {r.name || "Unnamed"}
                  </span>
                  <span className="flex flex-none items-center gap-2">
                    {r.submitted ? (
                      <>
                        <Badge variant="success" pill>
                          Responded
                        </Badge>
                        <ChevronRight
                          size={16}
                          className="text-[color:var(--text-quaternary)]"
                          aria-hidden="true"
                        />
                      </>
                    ) : (
                      <Badge variant="neutral" pill>
                        No response
                      </Badge>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {hasMore && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Load more
            </Button>
          )}
        </>
      )}

      <RespondentAnswersDialog
        occurrenceId={occurrenceId}
        member={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
