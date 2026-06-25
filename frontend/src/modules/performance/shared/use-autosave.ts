"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Draft autosave for the survey builder and the evaluation editor.
 *
 * Two layers, by design (see the create-minimum constraint below):
 *  - **localStorage buffer** — every edit is mirrored to the browser immediately, so a
 *    refresh or accidental close never loses in-progress work. This is the only safety net
 *    while the form is still too incomplete to persist server-side.
 *  - **server save** — debounced. The first server write for a brand-new form is a *create*
 *    (the backend's create endpoints reject partial drafts, so this only fires once the form
 *    meets the create minimum, `canPersist`); every write after that is an incremental update.
 *
 * The hook owns *when* to save and the save lifecycle (sequencing, in-flight dedupe, status,
 * timestamp, buffer). The consumer owns *how* to save (`onSave` builds the wire payload and
 * calls its own create/update mutation) and *what* the snapshot looks like.
 */

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface UseAutosaveParams {
  /** Autosave only runs while the dialog is open. */
  open: boolean;
  /** Master switch — false for view-only / locked records. */
  enabled: boolean;
  /** While true (e.g. an edit's record is still loading) the hook stays disarmed. */
  loading?: boolean;
  /** Server draft id; null until the draft is created. */
  draftId: string | null;
  /** Serializable form snapshot — drives change detection and the localStorage buffer. */
  snapshot: unknown;
  /** Whether the form meets the server create minimum. Server save waits for this. */
  canPersist: boolean;
  /** localStorage key for the buffer (e.g. "autosave:survey:new"). */
  storageKey: string;
  /** Persist to the server. Receives the current draft id; returns the (new or same) id. */
  onSave: (draftId: string | null) => Promise<string>;
  /** Debounce before a server save (ms). */
  debounceMs?: number;
}

export interface AutosaveApi {
  status: AutosaveStatus;
  /** Epoch ms of the last successful server save (this open session). */
  lastSavedAt: number | null;
  /** Server save is gated until the form is complete enough to create. */
  canPersist: boolean;
  /** A buffer found on open — present it to the user to restore. Null when none. */
  recoverable: unknown | null;
  /** Call once after hydrating state on open, with the snapshot of the hydrated state. */
  setBaseline: (snapshot: unknown) => void;
  /** Hide the restore prompt without touching the buffer (consumer applied it). */
  acceptRecovery: () => void;
  /** Drop the buffer and the restore prompt. */
  discardRecovery: () => void;
  /** Cancel a pending debounced save (manual action is taking over). */
  cancel: () => void;
  /** Persist now, skipping the debounce (e.g. the dialog is closing). No-op if clean. */
  flush: () => void;
  /** Remove the localStorage buffer (e.g. after a manual save persisted the work). */
  clearBuffer: () => void;
  /** Retry after an error. */
  retry: () => void;
}

function readBuffer(key: string): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeBuffer(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota / privacy mode — buffering is best-effort */
  }
}

function removeBuffer(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function useAutosave(params: UseAutosaveParams): AutosaveApi {
  const { open, enabled, loading = false, draftId, snapshot, canPersist, storageKey, onSave } =
    params;
  const debounceMs = params.debounceMs ?? 1200;

  const serialized = useMemo(() => JSON.stringify(snapshot), [snapshot]);

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [recoverable, setRecoverable] = useState<unknown | null>(null);

  // Latest-value refs so the async save closure never reads stale props.
  const serializedRef = useRef(serialized);
  serializedRef.current = serialized;
  const canPersistRef = useRef(canPersist);
  canPersistRef.current = canPersist;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  // The clean reference: snapshot equals this → no unsaved changes. Set on hydrate and
  // after each successful save. Null = not yet armed (waiting for hydration).
  const baselineRef = useRef<string | null>(null);
  const lastSavedSerializedRef = useRef<string | null>(null);

  // Draft id, mirrored to a ref and never downgraded to null mid-session (a just-created
  // id must survive the render before the parent prop catches up).
  const draftIdRef = useRef<string | null>(draftId);
  if (open && draftId) draftIdRef.current = draftId;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearBuffer = useCallback(() => {
    removeBuffer(storageKeyRef.current);
  }, []);

  const doSave = useCallback(async () => {
    if (!canPersistRef.current) return; // not yet persistable — buffer already holds it
    const snap = serializedRef.current;
    if (snap === lastSavedSerializedRef.current) return; // nothing new to save
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }
    inFlightRef.current = true;
    setStatus("saving");
    try {
      const newId = await onSaveRef.current(draftIdRef.current);
      draftIdRef.current = newId;
      lastSavedSerializedRef.current = snap;
      baselineRef.current = snap; // saved state is the new clean baseline
      removeBuffer(storageKeyRef.current);
      setLastSavedAt(Date.now());
      setStatus(serializedRef.current === snap ? "saved" : "dirty");
    } catch {
      setStatus("error");
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void doSave();
      }
    }
  }, []);

  const setBaseline = useCallback((snap: unknown) => {
    baselineRef.current = JSON.stringify(snap);
  }, []);

  // Read any existing buffer once per open and offer it for recovery.
  useEffect(() => {
    if (!open) return;
    const buffered = readBuffer(storageKeyRef.current);
    if (buffered != null) setRecoverable(buffered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // When the storage key changes (a "new" draft just got its id), migrate the buffer slot
  // so the old "new" key can't linger and offer a stale restore later.
  const prevKeyRef = useRef(storageKey);
  useEffect(() => {
    if (prevKeyRef.current !== storageKey) {
      removeBuffer(prevKeyRef.current);
      prevKeyRef.current = storageKey;
    }
  }, [storageKey]);

  // Change detection: buffer + schedule a save whenever the snapshot diverges from baseline.
  useEffect(() => {
    if (!open || !enabled || loading) return;
    if (baselineRef.current === null) return; // not hydrated yet
    if (serialized === baselineRef.current) return; // clean
    writeBuffer(storageKeyRef.current, serialized);
    setStatus((s) => (s === "saving" ? s : "dirty"));
    cancel();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void doSave();
    }, debounceMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, open, enabled, loading]);

  // Reset everything for the next open.
  useEffect(() => {
    if (open) return;
    cancel();
    baselineRef.current = null;
    lastSavedSerializedRef.current = null;
    inFlightRef.current = false;
    pendingRef.current = false;
    draftIdRef.current = null;
    setStatus("idle");
    setLastSavedAt(null);
    setRecoverable(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const flush = useCallback(() => {
    cancel();
    void doSave();
  }, [cancel, doSave]);

  const acceptRecovery = useCallback(() => setRecoverable(null), []);
  const discardRecovery = useCallback(() => {
    removeBuffer(storageKeyRef.current);
    setRecoverable(null);
  }, []);
  const retry = useCallback(() => {
    void doSave();
  }, [doSave]);

  return {
    status,
    lastSavedAt,
    canPersist,
    recoverable,
    setBaseline,
    acceptRecovery,
    discardRecovery,
    cancel,
    flush,
    clearBuffer,
    retry,
  };
}
