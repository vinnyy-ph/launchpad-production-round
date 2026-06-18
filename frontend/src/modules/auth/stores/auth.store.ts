import { create } from "zustand";
import type { AppUser } from "../types/auth.types";

interface AuthStore {
  appUser: AppUser | null;
  loading: boolean;
}

export const useAuthStore = create<AuthStore>(() => ({
  appUser: null,
  loading: true,
}));

// Shape returned by POST /api/auth/session (backend resolveSession).
interface SessionResponse {
  userId: string;
  employeeId: string | null;
  role: "ADMIN" | "HR" | "EMPLOYEE";
  isSupervisor: boolean;
  isActive: boolean;
  employeeStatus: "ONBOARDING" | "ACTIVE" | "OFFBOARDING" | "INACTIVE" | null;
  email: string;
  displayName: string | null;
}

function toAppUser(session: SessionResponse): AppUser {
  return {
    userId: session.userId,
    employeeId: session.employeeId ?? "",
    role: session.role,
    isSupervisor: session.isSupervisor,
    isActive: session.isActive,
    // A provisioned account always has a status; default defensively for the rare
    // user-without-employee edge so the onboarding gate doesn't misfire.
    employeeStatus: session.employeeStatus ?? "ACTIVE",
    email: session.email,
    displayName: session.displayName,
  };
}

let listenerStarted = false;

/** Subscribe to Firebase auth state (called once by AuthProvider). On sign-in, exchange
 * the Firebase ID token for the real backend session; on sign-out, clear. */
export function initAuthListener(): void {
  if (listenerStarted) return;
  listenerStarted = true;

  void (async () => {
    try {
      const { onAuthStateChanged } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/shared/lib/firebase");
      onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
        if (!firebaseUser) {
          useAuthStore.setState({ appUser: null, loading: false });
          return;
        }
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (!res.ok) {
            // Not invited / deactivated / token rejected — treat as signed-out.
            useAuthStore.setState({ appUser: null, loading: false });
            return;
          }
          const session = (await res.json()) as SessionResponse;
          useAuthStore.setState({ appUser: toAppUser(session), loading: false });
        } catch {
          useAuthStore.setState({ appUser: null, loading: false });
        }
      });
    } catch {
      // Firebase failed to initialize (e.g. missing env) — drop to the login form.
      useAuthStore.setState({ appUser: null, loading: false });
    }
  })();
}

/** Flip the current user to Active in-session (wizard activation releases the gate). */
export function markEmployeeActive(): void {
  useAuthStore.setState((s) =>
    s.appUser ? { appUser: { ...s.appUser, employeeStatus: "ACTIVE", isActive: true } } : s,
  );
}

export function clearSession(): void {
  useAuthStore.setState({ appUser: null, loading: false });
}
