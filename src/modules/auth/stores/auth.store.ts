import { create } from "zustand";
import type { AppUser } from "../types/auth.types";
import { DEMO_PROFILES, DEFAULT_VIEW, type DemoView } from "@/shared/mock/identity";

const SESSION_KEY = "swiftwork-demo-session";

interface AuthStore {
  appUser: AppUser | null;
  loading: boolean;
}

export const useAuthStore = create<AuthStore>(() => ({
  appUser: null,
  loading: true,
}));

function readSessionView(): DemoView | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(SESSION_KEY) as DemoView | null;
  return v && v in DEMO_PROFILES ? v : null;
}

/** Hydrate auth state from the persisted session (called once by AuthProvider). */
export function initAuthListener(): void {
  const view = readSessionView();
  useAuthStore.setState({
    appUser: view ? DEMO_PROFILES[view] : null,
    loading: false,
  });
}

/** Set the active demo view (login + role switcher) and persist it. */
export function setView(view: DemoView): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, view);
  }
  useAuthStore.setState({ appUser: DEMO_PROFILES[view], loading: false });
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
  }
  useAuthStore.setState({ appUser: null, loading: false });
}

export { DEFAULT_VIEW };
