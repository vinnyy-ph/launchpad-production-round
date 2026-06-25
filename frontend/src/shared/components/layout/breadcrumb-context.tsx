"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface BreadcrumbContextValue {
  /** Extra trailing crumbs a page appends to the nav-bar breadcrumb (e.g. a record name). */
  extraCrumbs: string[];
  setExtraCrumbs: (crumbs: string[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [extraCrumbs, setExtraCrumbs] = useState<string[]>([]);

  return (
    <BreadcrumbContext.Provider value={{ extraCrumbs, setExtraCrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/** Read the page-provided extra crumbs. Returns [] when no provider/crumbs. */
export function useExtraBreadcrumbs(): string[] {
  return useContext(BreadcrumbContext)?.extraCrumbs ?? [];
}

/**
 * Appends dynamic trailing crumbs (e.g. an employee name) to the nav-bar breadcrumb
 * for the lifetime of the calling page. Cleared automatically on unmount.
 */
export function usePageBreadcrumb(crumbs: string[]): void {
  const ctx = useContext(BreadcrumbContext);
  const key = crumbs.join("›");

  useEffect(() => {
    if (!ctx) return;
    ctx.setExtraCrumbs(crumbs.filter(Boolean));
    return () => ctx.setExtraCrumbs([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
