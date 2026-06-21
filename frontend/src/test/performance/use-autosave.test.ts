import { act, renderHook } from "@testing-library/react";
import { useAutosave } from "@/modules/performance/shared/use-autosave";

const KEY = "autosave:test:new";

type Props = Parameters<typeof useAutosave>[0];

function baseProps(over: Partial<Props> = {}): Props {
  return {
    open: true,
    enabled: true,
    draftId: null,
    snapshot: { v: 0 },
    canPersist: false,
    storageKey: KEY,
    onSave: jest.fn().mockResolvedValue("new-id"),
    debounceMs: 1000,
    ...over,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  window.localStorage.clear();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("useAutosave", () => {
  it("does not save before it is armed (baseline set on hydrate)", () => {
    const onSave = jest.fn().mockResolvedValue("id");
    const { rerender } = renderHook((p: Props) => useAutosave(p), {
      initialProps: baseProps({ onSave }),
    });
    // Snapshot changes but setBaseline was never called → still disarmed.
    rerender(baseProps({ onSave, snapshot: { v: 1 }, canPersist: true }));
    act(() => jest.advanceTimersByTime(2000));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("buffers to localStorage while not yet persistable, without a server save", () => {
    const onSave = jest.fn().mockResolvedValue("id");
    const { result, rerender } = renderHook((p: Props) => useAutosave(p), {
      initialProps: baseProps({ onSave }),
    });
    act(() => result.current.setBaseline({ v: 0 }));
    rerender(baseProps({ onSave, snapshot: { v: 1 }, canPersist: false }));
    act(() => jest.advanceTimersByTime(1000));

    expect(onSave).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(KEY)).toBe(JSON.stringify({ v: 1 }));
  });

  it("creates once when valid, then updates with the new id, and clears the buffer", async () => {
    const onSave = jest.fn().mockResolvedValue("new-id");
    const { result, rerender } = renderHook((p: Props) => useAutosave(p), {
      initialProps: baseProps({ onSave }),
    });
    act(() => result.current.setBaseline({ v: 0 }));

    // First persistable change → create (draftId null).
    rerender(baseProps({ onSave, snapshot: { v: 1 }, canPersist: true }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenNthCalledWith(1, null);
    expect(window.localStorage.getItem(KEY)).toBeNull(); // cleared after save
    expect(result.current.lastSavedAt).not.toBeNull();
    expect(result.current.status).toBe("saved");

    // Next change → update with the id captured from the create.
    rerender(baseProps({ onSave, snapshot: { v: 2 }, canPersist: true, draftId: "new-id" }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(2, "new-id");
  });

  it("does not save when the snapshot is unchanged from the last save", async () => {
    const onSave = jest.fn().mockResolvedValue("new-id");
    const { result, rerender } = renderHook((p: Props) => useAutosave(p), {
      initialProps: baseProps({ onSave }),
    });
    act(() => result.current.setBaseline({ v: 0 }));
    rerender(baseProps({ onSave, snapshot: { v: 1 }, canPersist: true }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);

    // Re-render with the same content (new object, same value) → no second save.
    rerender(baseProps({ onSave, snapshot: { v: 1 }, canPersist: true, draftId: "new-id" }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("offers a found buffer for recovery and discards it on request", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 9 }));
    const { result } = renderHook((p: Props) => useAutosave(p), {
      initialProps: baseProps(),
    });
    expect(result.current.recoverable).toEqual({ v: 9 });
    act(() => result.current.discardRecovery());
    expect(result.current.recoverable).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("surfaces an error status when the server save rejects", async () => {
    const onSave = jest.fn().mockRejectedValue(new Error("boom"));
    const { result, rerender } = renderHook((p: Props) => useAutosave(p), {
      initialProps: baseProps({ onSave }),
    });
    act(() => result.current.setBaseline({ v: 0 }));
    rerender(baseProps({ onSave, snapshot: { v: 1 }, canPersist: true }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.status).toBe("error");
  });
});
