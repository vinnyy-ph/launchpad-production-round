"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useOptionalConfirm } from "@/shared/ui/patterns/confirm-dialog";

/** Default copy for the gentle nudge shown on an ambiguous close (Esc / backdrop). */
const UNSAVED_MESSAGE = "There are unsaved changes. Save or discard them before closing.";

/**
 * Shared "unsaved changes" guard for form modals — a two-tier model matched to intent:
 *
 * - **Ambiguous close** (Esc / backdrop): a gentle *nudge* — haptic buzz, a top-center red toast,
 *   and a modal shake — and the modal stays open. The user probably didn't mean to leave.
 * - **Explicit close** (the ✕ button / a Cancel button): a decisive *"Discard changes?"* confirm
 *   (`Keep editing` / `Discard`). The user clearly wants out, so we don't trap them — we just
 *   guard against losing work to a misclick.
 *
 * Requires `<ConfirmProvider>` above it in the tree (app-wide via providers.tsx).
 *
 * Usage:
 *   const guard = useUnsavedGuard({ hasUnsavedChanges, onOpenChange });
 *   <Dialog open={open} onOpenChange={guard.handleOpenChange}>
 *     <DialogContent
 *       className={`… ${guard.shakeClass}`}
 *       onAnimationEnd={guard.onAnimationEnd}
 *       onEscapeKeyDown={guard.onEscapeKeyDown}
 *       onInteractOutside={guard.onInteractOutside}
 *     >
 *       …
 *       <Button variant="secondary" onClick={() => guard.handleOpenChange(false)}>Cancel</Button>
 */
export function useUnsavedGuard({
  hasUnsavedChanges,
  onOpenChange,
  message = UNSAVED_MESSAGE,
}: {
  hasUnsavedChanges: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}) {
  const [shake, setShake] = useState(false);
  const toastIdRef = useRef<string | number | null>(null);
  const confirm = useOptionalConfirm();

  /** Gentle nudge for ambiguous closes — buzz + toast + shake; the modal stays open. */
  function nudge() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(90);
    }
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }
    const toastId = `unsaved-changes-${Date.now()}`;
    toastIdRef.current = toastId;
    window.requestAnimationFrame(() => {
      toast.error(message, {
        id: toastId,
        position: "top-center",
        // Let the user discard-and-close right from the nudge, not just "save or discard first".
        action: { label: "Discard", onClick: () => onOpenChange(false) },
        classNames: {
          toast: "employee-unsaved-toast-shake !border-[#B42318] !bg-[#FEF3F2] !text-[#7A271A]",
          title: "!text-[#7A271A]",
          actionButton: "!bg-[#B42318] !text-white",
        },
      });
    });
    // Restart the shake animation even on repeated attempts.
    setShake(false);
    window.requestAnimationFrame(() => setShake(true));
  }

  /** Decisive prompt for explicit closes — "Discard changes?"; closes only on confirm. */
  async function confirmDiscard() {
    const ok = confirm
      ? await confirm({
          title: "Discard changes?",
          description: "Your unsaved changes will be lost. This can't be undone.",
          confirmLabel: "Discard",
          cancelLabel: "Keep editing",
          destructive: true,
        })
      : typeof window !== "undefined" &&
        window.confirm("Discard changes? Your unsaved changes will be lost.");
    if (ok) onOpenChange(false);
  }

  /**
   * For `<Dialog onOpenChange>` and explicit Cancel buttons (`onClick={() => handleOpenChange(false)}`).
   * Esc/backdrop are intercepted on the content below, so a dirty close reaching here is an
   * explicit exit (✕ / Cancel / programmatic) → confirm. Clean closes pass straight through.
   */
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && hasUnsavedChanges) {
      void confirmDiscard();
      return;
    }
    onOpenChange(nextOpen);
  }

  return {
    handleOpenChange,
    /** Append to `<DialogContent className>` — drives the shake animation. */
    shakeClass: shake ? "employee-unsaved-alert-shake" : "",
    /** `<DialogContent onAnimationEnd>`. */
    onAnimationEnd: () => setShake(false),
    /** `<DialogContent onEscapeKeyDown>` — nudge instead of closing when dirty. */
    onEscapeKeyDown: (event: { preventDefault: () => void }) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        nudge();
      }
    },
    /** `<DialogContent onInteractOutside>` — a dirty form nudges instead of dismissing;
     *  a clean one dismisses on backdrop normally (mirrors onEscapeKeyDown). */
    onInteractOutside: (event: { preventDefault: () => void }) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        nudge();
      }
    },
  };
}
