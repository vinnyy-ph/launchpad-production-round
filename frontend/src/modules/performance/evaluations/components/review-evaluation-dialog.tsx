"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from "@/shared/ui";
import type { Evaluation } from "../types/evaluations.types";

const GRADE_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Needs improvement",
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

function formatPeriod(startIso: string, endIso: string): string {
  return `${fmtDate(startIso)} – ${fmtDate(endIso)}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
        {title}
      </p>
      {children}
    </div>
  );
}

export interface ReviewEvaluationDialogProps {
  open: boolean;
  evaluation: Evaluation | null;
  onClose: () => void;
  onAcknowledge: (evaluationId: string) => void;
  acknowledging?: boolean;
}

export function ReviewEvaluationDialog({
  open,
  evaluation: ev,
  onClose,
  onAcknowledge,
  acknowledging,
}: ReviewEvaluationDialogProps) {
  const [justAcked, setJustAcked] = useState(false);

  useEffect(() => {
    if (open) setJustAcked(false);
  }, [open, ev?.id]);

  if (!ev) return null;

  const isAcknowledged = !!ev.acknowledgement?.acknowledgedAt || justAcked;
  const isDeemed = !isAcknowledged && !!ev.acknowledgement?.isDeemedAck;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-[color:var(--border-primary)] px-6 pb-4 pt-6 text-left">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
            Performance evaluation
          </p>
          <DialogTitle className="mt-1 text-xl font-bold tracking-tight">
            {formatPeriod(ev.periodStart, ev.periodEnd)}
          </DialogTitle>
          <DialogDescription>From {ev.reviewer?.fullName ?? "Your supervisor"}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 pt-5">
          {/* Grade headline */}
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-[color:var(--text-primary)] text-xl font-bold text-white">
              {ev.grade}
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold text-[color:var(--text-primary)]">
                {GRADE_LABELS[ev.grade] ?? `Grade ${ev.grade}`}
              </p>
              <p className="text-[13px] text-[color:var(--text-tertiary)]">Overall grade</p>
            </div>
          </div>

          {ev.highlights && ev.highlights.length > 0 && (
            <Section title="Highlights">
              <ul className="space-y-1.5">
                {ev.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[color:var(--text-primary)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[color:var(--color-success-600)]" />
                    {h}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {ev.lowlights && ev.lowlights.length > 0 && (
            <Section title="Areas for improvement">
              <ul className="space-y-1.5">
                {ev.lowlights.map((l, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[color:var(--text-primary)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[color:var(--color-warning-600)]" />
                    {l}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {ev.evaluation && (
            <Section title="Summary">
              <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--text-primary)]">
                {ev.evaluation}
              </p>
            </Section>
          )}

          {ev.recommendation && (
            <Section title="Recommendation">
              <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--text-primary)]">
                {ev.recommendation}
              </p>
            </Section>
          )}

          {ev.supportingDocUrl && (
            <Section title="Links">
              <a
                href={ev.supportingDocUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 break-all text-sm text-[color:var(--brand-blue)] underline underline-offset-2"
              >
                <ExternalLink size={14} className="flex-none" />
                {ev.supportingDocUrl}
              </a>
            </Section>
          )}
        </div>

        {/* Footer — acknowledgment */}
        <div className="border-t border-[color:var(--border-primary)] px-6 py-4">
          {isAcknowledged ? (
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-[color:var(--color-success-600)]">
              <CheckCircle2 size={16} />
              {justAcked
                ? "Acknowledged just now"
                : `Acknowledged on ${fmtDate(ev.acknowledgement?.acknowledgedAt)}`}
            </p>
          ) : isDeemed ? (
            <p className="text-center text-[13px] text-[color:var(--text-tertiary)]">
              Deemed acknowledged on {fmtDate(ev.ackDeadline)} — no action needed.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-[12.5px] text-[color:var(--text-tertiary)]">
                Acknowledging confirms you&apos;ve read this. It doesn&apos;t mean you agree.
                Auto-acknowledged on {fmtDate(ev.ackDeadline)} if not done.
              </p>
              <Button
                onClick={() => {
                  onAcknowledge(ev.id);
                  setJustAcked(true);
                }}
                disabled={acknowledging}
              >
                {acknowledging ? "Acknowledging…" : "Acknowledge"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
