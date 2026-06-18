import { create } from "zustand";
import type { AppUser } from "../types/auth.types";
import { VIEW_PROFILES, DEFAULT_VIEW, EMAIL_TO_VIEW, type DemoView } from "@/shared/mock/identity";
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

// Resolve a signed-in Google account to a demo persona. A persisted role-switcher
// choice wins (so a switch survives reload); otherwise the account's email is
// mapped via EMAIL_TO_VIEW; unknown accounts fall back to the default view.
function resolveView(email: string | null): DemoView {
  return (
    readSessionView() ??
    (email ? EMAIL_TO_VIEW[email.toLowerCase()] : undefined) ??
    DEFAULT_VIEW
  );
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

let listenerStarted = false;

/** Subscribe to Firebase auth state (called once by AuthProvider). On sign-in,
 * map the Google account to a demo persona; on sign-out, clear. */
export function initAuthListener(): void {
  if (listenerStarted) return;
  listenerStarted = true;

  void (async () => {
    try {
      const { onAuthStateChanged } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/shared/lib/firebase");
      onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
        if (!firebaseUser) {
          useAuthStore.setState({ appUser: null, loading: false });
          return;
        }
        const view = resolveView(firebaseUser.email);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SESSION_KEY, view);
        }
        useAuthStore.setState({
          appUser: withLiveStatus(VIEW_PROFILES[view]),
          loading: false,
        });
      });
    } catch {
      // Firebase failed to initialize (e.g. missing env) — drop to the login form.
      useAuthStore.setState({ appUser: null, loading: false });
    }
  })();
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
