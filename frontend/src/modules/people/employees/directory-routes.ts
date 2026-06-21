/** Directory segments shown as tabs on the People page. */
export type DirectoryTab = "all" | "onboarding" | "offboarding";

const VALID_TABS = new Set<DirectoryTab>(["all", "onboarding", "offboarding"]);

/** Parse `?tab=` from the URL; invalid or missing values default to All. */
export function parseDirectoryTab(raw: string | null | undefined): DirectoryTab {
  if (raw && VALID_TABS.has(raw as DirectoryTab) && raw !== "all") {
    return raw as DirectoryTab;
  }
  return "all";
}

/** Client route for the People directory with the given tab selected. */
export function hrDirectoryHref(tab: DirectoryTab = "all"): string {
  return tab === "all" ? "/hr/directory" : `/hr/directory?tab=${tab}`;
}
