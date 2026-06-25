import { create } from "zustand";

export type SettingsTab = "profile" | "notifications";

interface SettingsModalState {
  open: boolean;
  tab: SettingsTab;
  /** Opens the Settings modal on the given tab (defaults to My Profile). */
  openSettings: (tab?: SettingsTab) => void;
  /** Switches the active tab without closing the modal. */
  setTab: (tab: SettingsTab) => void;
  close: () => void;
}

/**
 * App-wide control for the Settings modal. Mounted once in the (app) layout and opened
 * from the topbar account menu, so any surface can route the user to their profile or
 * notification settings without a dedicated page.
 */
export const useSettingsModal = create<SettingsModalState>((set) => ({
  open: false,
  tab: "profile",
  openSettings: (tab = "profile") => set({ open: true, tab }),
  setTab: (tab) => set({ tab }),
  close: () => set({ open: false }),
}));
