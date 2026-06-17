// jsdom shims so Radix UI (AlertDialog/Dialog) can render and be interacted with.
// Guard for tests that run in the node environment (e.g. api-client.test.ts).
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.setPointerCapture = () => {};
  window.HTMLElement.prototype.releasePointerCapture = () => {};

  window.matchMedia = ((query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList);

  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver;
}
