"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Scan,
} from "lucide-react";
import { Button } from "@/shared/ui";

/** Zoom limits for the canvas — keeps cards legible at the low end and readable at the high end. */
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

interface OrgChartCanvasProps {
  /** The org chart tree to render on the pan/zoom surface. */
  children: ReactNode;
  /**
   * Optional external ref to the canvas container — the element that goes full screen. Pass this
   * when the caller needs to portal overlays (e.g. a detail drawer) into the canvas so they stay
   * visible in full screen.
   */
  containerRef?: RefObject<HTMLDivElement>;
  /** Notified whenever the canvas enters/exits full screen, so callers can react (e.g. re-portal). */
  onFullscreenChange?: (isFullscreen: boolean) => void;
  /** Expand every subtree. When set, an "Expand all" control appears on the canvas. */
  onExpandAll?: () => void;
  /** Collapse subtrees back to the default view. When set, a "Collapse all" control appears. */
  onCollapseAll?: () => void;
  /**
   * When this value changes, the canvas re-fits and re-centers the chart. Callers should change it
   * whenever the chart's layout shifts under it (filtering, searching, expand/collapse all) so the
   * view re-frames the result instead of leaving it off-screen.
   */
  recenterKey?: string | number;
}

/**
 * Figma-like canvas for the org chart: drag empty space to pan, scroll/pinch to zoom toward the
 * cursor, and on-screen controls for +/−, fit-to-screen, expand/collapse all, and full-screen
 * (Fullscreen API). The controls live on the canvas so they stay available in full screen.
 *
 * The chart itself stays a plain CSS tree; this only wraps it in a pannable, zoomable surface
 * (bounded to the chart's edges), so node detail and connector reflow stay the tree's own concern.
 */
export function OrgChartCanvas({
  children,
  containerRef: externalContainerRef,
  onFullscreenChange,
  onExpandAll,
  onCollapseAll,
  recenterKey,
}: OrgChartCanvasProps) {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef ?? internalContainerRef;
  const apiRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep local state in sync with the browser — Esc and the OS chrome can exit fullscreen too.
  useEffect(() => {
    const onChange = () => {
      const next = document.fullscreenElement === containerRef.current;
      setIsFullscreen(next);
      onFullscreenChange?.(next);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [containerRef, onFullscreenChange]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  }, []);

  /** Scale the whole chart down to fit the viewport, then center it. */
  const fitToScreen = useCallback(() => {
    const api = apiRef.current;
    const wrapper = api?.instance.wrapperComponent;
    const content = api?.instance.contentComponent;
    if (!api || !wrapper || !content) return;
    // offsetWidth/Height are the untransformed layout sizes, so this ratio is the fit scale.
    const scale = Math.min(
      wrapper.offsetWidth / content.offsetWidth,
      wrapper.offsetHeight / content.offsetHeight,
      MAX_SCALE,
    );
    api.centerView(Math.max(MIN_SCALE, Math.min(scale, 1)), 200);
  }, []);

  // Fit on mount and whenever `recenterKey` changes (filter / search / expand-collapse all), after
  // the tree has re-laid out — two frames: React commits the new tree → browser lays it out → fit.
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => fitToScreen()));
    return () => cancelAnimationFrame(id);
  }, [fitToScreen, recenterKey]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden border border-[color:var(--border-primary)] bg-white ${
        isFullscreen ? "h-screen w-screen rounded-none" : "h-[70vh] rounded-xl"
      }`}
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <TransformWrapper
        ref={apiRef}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        initialScale={1}
        centerOnInit
        // Pan freely across the chart, but stop at its edges so it can't be dragged off into empty
        // space. When the whole chart is smaller than the viewport, keep it centered (nothing to pan).
        limitToBounds
        centerZoomedOut
        wheel={{ step: 0.08 }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          wrapperClass="org-canvas-surface"
        >
          <div className="p-16">{children}</div>
        </TransformComponent>
      </TransformWrapper>

      {/* Top-left: expand / collapse the whole tree (kept on-canvas so they work in full screen). */}
      {onExpandAll || onCollapseAll ? (
        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          {onExpandAll ? (
            <Button variant="outline" size="sm" onClick={onExpandAll}>
              <ChevronsUpDown aria-hidden="true" />
              Expand all
            </Button>
          ) : null}
          {onCollapseAll ? (
            <Button variant="outline" size="sm" onClick={onCollapseAll}>
              <ChevronsDownUp aria-hidden="true" />
              Collapse all
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Top-right: enter/exit full screen. */}
      <CanvasButton
        className="absolute right-4 top-4"
        label={isFullscreen ? "Exit full screen" : "View full screen"}
        onClick={toggleFullscreen}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </CanvasButton>

      {/* Bottom-right: zoom cluster. */}
      <div
        className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full border border-[color:var(--border-primary)] bg-white/90 p-1 backdrop-blur"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <CanvasButton label="Zoom out" onClick={() => apiRef.current?.zoomOut()} bare>
          <Minus className="h-4 w-4" />
        </CanvasButton>
        <CanvasButton label="Fit to screen" onClick={fitToScreen} bare>
          <Scan className="h-4 w-4" />
        </CanvasButton>
        <CanvasButton label="Zoom in" onClick={() => apiRef.current?.zoomIn()} bare>
          <Plus className="h-4 w-4" />
        </CanvasButton>
      </div>
    </div>
  );
}

interface CanvasButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  /** Bare buttons sit inside the shared zoom pill, so they drop their own border/background. */
  bare?: boolean;
}

/** Icon-only control button for the canvas overlay; `label` becomes its accessible name. */
function CanvasButton({ label, onClick, children, className = "", bare = false }: CanvasButtonProps) {
  const chrome = bare
    ? "hover:bg-[color:var(--bg-secondary)]"
    : "border border-[color:var(--border-primary)] bg-white/90 backdrop-blur hover:bg-[color:var(--bg-secondary)]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors ${chrome} ${className}`}
      style={bare ? undefined : { boxShadow: "var(--shadow-sm)" }}
    >
      {children}
    </button>
  );
}
