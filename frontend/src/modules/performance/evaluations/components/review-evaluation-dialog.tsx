"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, User, Calendar, Clock, Eye, Download, Info, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui";
import { StatusBadge } from "@/shared/ui/patterns";
import type { Evaluation } from "../types/evaluations.types";
import { downloadSupportingDoc } from "../services/evaluations.service";

// Sentence case (Jia), not the Title Case shared map.
const GRADE_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Below expectations",
  3: "Meets expectations",
  4: "Exceeds expectations",
  5: "Exceptional",
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** "Jan 1 – Mar 31, 2026" — the start year is dropped when both ends share it. */
function formatPeriod(startIso: string, endIso: string): string {
  const a = new Date(startIso);
  const b = new Date(endIso);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return "—";
  const start = a.toLocaleDateString(
    undefined,
    a.getFullYear() === b.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  );
  return `${start} – ${fmtDate(endIso)}`;
}

/** "Date sent" — relative when near today, otherwise an absolute date. */
function fmtRelative(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff <= 6) return `${diff} days ago`;
  return fmtDate(iso);
}

function extractFilename(value: string): string {
  const last = value.split("/").pop() ?? value;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

async function openDoc(evaluationId: string, docIndex: number): Promise<void> {
  try {
    await downloadSupportingDoc(evaluationId, docIndex);
  } catch {
    toast.error("Couldn't open the document. Please try again.");
  }
}

const INSET = { boxShadow: "inset 0 0 2px 0 rgba(0,16,53,0.16)" } as const;

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-bold leading-[22px] text-[color:var(--text-primary)]">{children}</h3>
  );
}

/** A bullet list of itemized notes (highlights / areas for improvement). */
function NoteList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((text, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-[#b9c0d4]" />
          <span className="text-base leading-6 text-[color:var(--text-secondary)] [text-wrap:pretty]">
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface ReviewEvaluationDialogProps {
  open: boolean;
  evaluation: Evaluation | null;
  onClose: () => void;
  /** Acknowledge handler. Omitted (or with `readOnly`) for viewers who aren't the reviewee. */
  onAcknowledge?: (evaluationId: string) => void;
  acknowledging?: boolean;
  /**
   * Read-only view for someone who isn't the reviewee (HR, an upward supervisor): hides the
   * Acknowledge action and uses neutral, third-person status copy.
   */
  readOnly?: boolean;
}

export function ReviewEvaluationDialog({
  open,
  evaluation: ev,
  onClose,
  onAcknowledge,
  acknowledging,
  readOnly = false,
}: ReviewEvaluationDialogProps) {
  const [justAcked, setJustAcked] = useState(false);

  useEffect(() => {
    if (open) setJustAcked(false);
  }, [open, ev?.id]);

  if (!ev) return null;

  const ack = ev.acknowledgement;
  const isAcknowledged = (!!ack?.acknowledgedAt && !ack.isDeemedAck) || justAcked;
  const isAutoAck = !isAcknowledged && !!ack?.isDeemedAck;
  const isPending = !isAcknowledged && !isAutoAck;

  const chip = isAcknowledged
    ? { tone: "success" as const, label: "Acknowledged", dot: false }
    : isAutoAck
      ? { tone: "neutral" as const, label: "Auto-acknowledged", dot: true }
      : { tone: "warning" as const, label: "Pending acknowledgement", dot: true };

  const subtitle = isAcknowledged
    ? justAcked && !ack?.acknowledgedAt
      ? "Acknowledged just now."
      : `Acknowledged on ${fmtDate(ack?.acknowledgedAt)}.`
    : isAutoAck
      ? `Auto-acknowledged on ${fmtDate(ev.ackDeadline)}.`
      : readOnly
        ? `Awaiting acknowledgement — due ${fmtDate(ev.ackDeadline)}.`
        : `Confirm you've read this evaluation by ${fmtDate(ev.ackDeadline)}.`;

  const revieweeName = ev.reviewee?.fullName ?? "you";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        hideClose
        className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[45rem] sm:rounded-[20px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header (fixed) */}
        <div className="flex flex-none items-start gap-4 border-b border-[color:var(--border-primary)] px-8 pb-5 pt-7">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <DialogTitle className="text-lg font-bold leading-7 tracking-tight text-[color:var(--text-primary)]">
                Evaluation for {revieweeName}
              </DialogTitle>
              <StatusBadge status={chip.label} tone={chip.tone} dot={chip.dot} />
              {isAutoAck && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        className="inline-flex cursor-help text-[color:var(--text-quaternary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Info size={16} aria-label="About auto-acknowledgement" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px]">
                      Marked acknowledged automatically after the acknowledgement due date passed.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <DialogDescription className="mt-1 text-sm leading-5 text-[color:var(--text-tertiary)]">
              {subtitle}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-[color:var(--border-primary)] bg-white text-[color:var(--text-tertiary)] transition-colors hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X size={18} />
            </button>
          </DialogClose>
        </div>

        {/* Body (scrolls) */}
        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-8 py-8 scrollbar-thin">
          {/* Record meta — Evaluator / Evaluation period / Date sent */}
          <div
            className="flex items-stretch rounded-xl border border-[color:var(--border-primary)] bg-white"
            style={INSET}
          >
            {[
              { icon: User, label: "Evaluator", value: ev.reviewer?.fullName ?? "Your supervisor" },
              { icon: Calendar, label: "Evaluation period", value: formatPeriod(ev.periodStart, ev.periodEnd) },
              { icon: Clock, label: "Date sent", value: fmtRelative(ev.sentAt) },
            ].map((cell, i) => (
              <div key={cell.label} className="flex flex-1 items-stretch">
                {i > 0 && <span className="w-px flex-none bg-[color:var(--border-primary)]" />}
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-4 py-[18px] text-center">
                  <div className="flex items-center gap-2">
                    <cell.icon size={18} className="flex-none text-[color:var(--text-tertiary)]" aria-hidden="true" />
                    <span className="text-base font-bold leading-[22px] text-[color:var(--text-primary)]">
                      {cell.label}
                    </span>
                  </div>
                  <span className="text-base leading-6 text-[color:var(--text-secondary)]">{cell.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Grade */}
          <div className="flex flex-col gap-3.5">
            <SectionHeading>Grade</SectionHeading>
            <div
              className="flex items-center gap-5 rounded-[14px] border border-[color:var(--border-primary)] bg-white px-[22px] py-[18px]"
              style={INSET}
            >
              <div className="flex flex-none items-baseline gap-1">
                <span className="text-lg font-bold leading-none tracking-tight text-[color:var(--text-primary)]">
                  {ev.grade}
                </span>
                <span className="text-sm font-medium leading-none text-[color:var(--text-quaternary)]">/5</span>
              </div>
              <span className="w-px self-stretch bg-[color:var(--border-primary)]" />
              <span className="text-base leading-6 text-[color:var(--text-primary)]">
                {GRADE_LABELS[ev.grade] ?? `Grade ${ev.grade}`}
              </span>
            </div>
          </div>

          {ev.highlights.length > 0 && (
            <div className="flex flex-col gap-3.5">
              <SectionHeading>Highlights</SectionHeading>
              <NoteList items={ev.highlights} />
            </div>
          )}

          {ev.lowlights.length > 0 && (
            <div className="flex flex-col gap-3.5">
              <SectionHeading>Areas for improvement</SectionHeading>
              <NoteList items={ev.lowlights} />
            </div>
          )}

          {ev.evaluation && (
            <div className="flex flex-col gap-2.5">
              <SectionHeading>Evaluation</SectionHeading>
              <p className="whitespace-pre-line text-base leading-6 text-[color:var(--text-secondary)] [text-wrap:pretty]">
                {ev.evaluation}
              </p>
            </div>
          )}

          {ev.recommendation && (
            <div className="flex flex-col gap-2.5">
              <SectionHeading>Recommendation</SectionHeading>
              <p className="whitespace-pre-line text-base leading-6 text-[color:var(--text-secondary)] [text-wrap:pretty]">
                {ev.recommendation}
              </p>
            </div>
          )}

          {ev.supportingDocUrls.length > 0 && (
            <div className="flex flex-col gap-3.5">
              <SectionHeading>Supporting documents</SectionHeading>
              <div className="flex flex-col gap-2.5">
                {ev.supportingDocUrls.map((publicId, index) => (
                  <div
                    key={publicId}
                    className="flex items-center gap-3.5 rounded-xl border border-[color:var(--border-primary)] bg-white p-3"
                  >
                    {/* Faux page thumbnail */}
                    <span className="flex h-[58px] w-[46px] flex-none flex-col gap-[3.5px] overflow-hidden rounded-md border border-[#e1e3e8] bg-white px-[7px] py-2 shadow-sm" aria-hidden="true">
                      <span className="h-[5px] w-[68%] rounded-sm bg-[#c9cdd6]" />
                      <span className="mt-0.5 h-[3px] w-full rounded-sm bg-[#e7e9ee]" />
                      <span className="h-[3px] w-full rounded-sm bg-[#e7e9ee]" />
                      <span className="h-[3px] w-[90%] rounded-sm bg-[#e7e9ee]" />
                      <span className="h-[3px] w-full rounded-sm bg-[#e7e9ee]" />
                      <span className="h-[3px] w-[55%] rounded-sm bg-[#e7e9ee]" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="truncate text-[15px] font-semibold leading-5 text-[color:var(--text-primary)]">
                        {extractFilename(publicId)}
                      </span>
                      <span className="text-[13px] leading-[18px] text-[color:var(--text-tertiary)]">PDF</span>
                    </span>
                    <div className="flex flex-none items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openDoc(ev.id, index)}
                        aria-label={`Preview ${extractFilename(publicId)}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--border-secondary)] bg-white text-[color:var(--text-tertiary)] transition-colors hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDoc(ev.id, index)}
                        aria-label={`Download ${extractFilename(publicId)}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--border-secondary)] bg-white text-[color:var(--text-tertiary)] transition-colors hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — Acknowledge action (pending only). Acknowledged / auto-acknowledged close via the X.
            Hidden for read-only viewers (HR / upward supervisors) who can't acknowledge. */}
        {isPending && !readOnly && (
          <div className="flex flex-none items-center justify-end gap-3 border-t border-[color:var(--border-primary)] px-8 py-[18px]">
            <Button variant="secondary" type="button" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                onAcknowledge?.(ev.id);
                setJustAcked(true);
              }}
              disabled={acknowledging}
            >
              <Check size={16} className="mr-1.5" />
              {acknowledging ? "Acknowledging…" : "Acknowledge"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
