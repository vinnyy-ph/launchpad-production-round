"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, AlertCircle, CloudOff } from "lucide-react";
import { Button } from "@/shared/ui";
import type { AutosaveStatus } from "./use-autosave";

function relative(from: number, now: number): string {
  const s = Math.max(0, Math.round((now - from) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s} sec ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} hr ago`;
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

interface DraftSaveStatusProps {
  status: AutosaveStatus;
  lastSavedAt: number | null;
  /** When false, edits are buffered locally but can't be saved server-side yet. */
  canPersist: boolean;
  onRetry: () => void;
}

/**
 * The bottom-left autosave indicator for the survey builder and evaluation editor.
 * Honest about where the work lives: a server "Saved 2 min ago (3:45 PM)" once the draft is
 * persistable, "Saved on this device" while it's only buffered locally.
 */
export function DraftSaveStatus({ status, lastSavedAt, canPersist, onRetry }: DraftSaveStatusProps) {
  // Re-render every 30s so the relative time keeps ticking while "saved".
  const [, force] = useState(0);
  useEffect(() => {
    if (status !== "saved" || lastSavedAt == null) return;
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [status, lastSavedAt]);

  const base = "flex items-center gap-1.5 text-sm font-medium text-[color:var(--text-tertiary)]";

  if (status === "saving") {
    return (
      <span className={base}>
        <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Saving…
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className={`${base} text-[color:var(--color-error-600)]`}>
        <AlertCircle size={13} aria-hidden="true" /> Couldn’t save
        <Button type="button" variant="link" size="xs" onClick={onRetry}>
          Retry
        </Button>
      </span>
    );
  }

  if (status === "saved" && lastSavedAt != null) {
    return (
      <span className={base} aria-live="polite">
        <Check size={13} className="text-[color:var(--brand-blue)]" aria-hidden="true" />
        Saved {relative(lastSavedAt, Date.now())} ({clock(lastSavedAt)})
      </span>
    );
  }

  // Dirty / idle. If it can't be persisted yet, reassure that it's at least buffered locally.
  if (status === "dirty" && !canPersist) {
    return (
      <span className={base}>
        <CloudOff size={13} aria-hidden="true" /> Saved on this device
      </span>
    );
  }

  if (status === "dirty") {
    return (
      <span className={base}>
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--text-quaternary)]" />
        Unsaved changes…
      </span>
    );
  }

  // idle, nothing saved yet
  return (
    <span className={base}>
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--text-quaternary)]" />
      Autosaves as you type
    </span>
  );
}
