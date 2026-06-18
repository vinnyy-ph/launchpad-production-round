import { create } from "zustand";
import type { AppUser } from "../types/auth.types";
import { VIEW_PROFILES, DEFAULT_VIEW, type DemoView } from "@/shared/mock/identity";
import { readCollection } from "@/shared/mock/db";
import type { DemoEmployee } from "@/shared/mock/types";

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
  return v && v in VIEW_PROFILES ? v : null;
}

// Overlay the persisted lifecycle status onto the static profile, so an
// activated new hire stays Active across reloads (and a reset brings them back
// to Onboarding). The static profile's status is only the seed default.
function withLiveStatus(user: AppUser): AppUser {
  if (typeof window === "undefined") return user;
  try {
    const emp = readCollection<DemoEmployee>("employees").find(
      (e) => e.employeeId === user.employeeId,
    );
    return emp
      ? { ...user, employeeStatus: emp.employeeStatus, isActive: emp.isActive }
      : user;
  } catch {
    return user;
  }
}

/** Hydrate auth state from the persisted session (called once by AuthProvider). */
export function initAuthListener(): void {
  const view = readSessionView();
  useAuthStore.setState({
    appUser: view ? withLiveStatus(VIEW_PROFILES[view]) : null,
    loading: false,
  });
}

/** Set the active demo view (login + role switcher) and persist it. */
export function setView(view: DemoView): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, view);
  }
  useAuthStore.setState({ appUser: withLiveStatus(VIEW_PROFILES[view]), loading: false });
}

/** Flip the current user to Active in-session (wizard activation releases the gate). */
export function markEmployeeActive(): void {
  useAuthStore.setState((s) =>
    s.appUser
      ? { appUser: { ...s.appUser, employeeStatus: "ACTIVE", isActive: true } }
      : s,
  );
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
  }
  useAuthStore.setState({ appUser: null, loading: false });
}

export { DEFAULT_VIEW };
