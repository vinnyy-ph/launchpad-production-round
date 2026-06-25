import { create } from "zustand";
import type { AppUser } from "../types/auth.types";

interface AuthStore {
  appUser: AppUser | null;
  loading: boolean;
  authError: string | null;
}

export const useAuthStore = create<AuthStore>(() => ({
  appUser: null,
  loading: true,
  authError: null,
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

const SESSION_FINGERPRINT_KEY = "swiftwork:session-fingerprint";
const ACCESS_CHANGED_MESSAGE =
  "Your access has changed. Please sign in again to continue.";

type SessionFingerprint = Pick<
  SessionResponse,
  "userId" | "role" | "isActive" | "employeeStatus" | "employeeId"
>;

function safeReadFingerprint(): SessionFingerprint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_FINGERPRINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionFingerprint>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.isActive !== "boolean"
    ) {
      return null;
    }
    // employeeId and employeeStatus can be null; accept anything else as "unknown" and drop it.
    return {
      userId: parsed.userId,
      role: parsed.role as SessionResponse["role"],
      isActive: parsed.isActive,
      employeeStatus: (parsed.employeeStatus ?? null) as SessionResponse["employeeStatus"],
      employeeId: (parsed.employeeId ?? null) as SessionResponse["employeeId"],
    };
  } catch {
    return null;
  }
}

function safeWriteFingerprint(fp: SessionFingerprint): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_FINGERPRINT_KEY, JSON.stringify(fp));
  } catch {
    // best-effort (private mode / quota)
  }
}

function safeClearFingerprint(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_FINGERPRINT_KEY);
  } catch {
    // best-effort
  }
}

/**
 * Build the AppUser from the backend session plus the signed-in Firebase account's
 * Google profile picture. `avatarUrl` comes from Firebase (not the backend) because it
 * belongs to the currently authenticated Google account; it is null when absent.
 */
function toAppUser(session: SessionResponse, avatarUrl: string | null): AppUser {
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
    avatarUrl,
  };
}

let listenerStarted = false;

async function readSessionError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown; message?: unknown };
    const message = typeof body.error === "string" ? body.error : body.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  } catch {
    // Fall through to the friendly default below.
  }

  return "We couldn't complete your sign-in. Please try again or contact your admin.";
}

async function syncAppUserFromFirebase(
  firebaseUser: import("firebase/auth").User,
): Promise<void> {
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
      const authError = await readSessionError(res);
      const { signOut } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/shared/lib/firebase");
      await signOut(getFirebaseAuth()).catch(() => undefined);
      safeClearFingerprint();
      useAuthStore.setState({ appUser: null, loading: false, authError });
      return;
    }
    const session = (await res.json()) as SessionResponse;

    // If the server-side session meaningfully changed (role, activation, etc), force a re-login.
    // This catches the "admin changed my role while I'm logged in" case even if the new role
    // still has access and would otherwise silently reshape the UI.
    const nextFp: SessionFingerprint = {
      userId: session.userId,
      employeeId: session.employeeId,
      role: session.role,
      isActive: session.isActive,
      employeeStatus: session.employeeStatus,
    };
    const prevFp = safeReadFingerprint();
    if (
      prevFp &&
      prevFp.userId === nextFp.userId &&
      (prevFp.role !== nextFp.role ||
        prevFp.isActive !== nextFp.isActive ||
        prevFp.employeeStatus !== nextFp.employeeStatus ||
        prevFp.employeeId !== nextFp.employeeId)
    ) {
      const { signOut } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/shared/lib/firebase");
      await signOut(getFirebaseAuth()).catch(() => undefined);
      safeClearFingerprint();
      useAuthStore.setState({
        appUser: null,
        loading: false,
        authError: ACCESS_CHANGED_MESSAGE,
      });
      return;
    }

    safeWriteFingerprint(nextFp);
    useAuthStore.setState({
      appUser: toAppUser(session, firebaseUser.photoURL),
      loading: false,
      authError: null,
    });
  } catch {
    safeClearFingerprint();
    useAuthStore.setState({
      appUser: null,
      loading: false,
      authError: "We couldn't complete your sign-in. Please try again.",
    });
  }
}

/** Subscribe to Firebase auth state (called once by AuthProvider). On sign-in, exchange
 * the Firebase ID token for the real backend session; on sign-out, clear. */
export function initAuthListener(): void {
  if (listenerStarted) return;
  listenerStarted = true;

  void (async () => {
    try {
      const { onAuthStateChanged } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/shared/lib/firebase");
      const auth = getFirebaseAuth();
      let persistenceReady = false;

      onAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser) {
          // Firebase may emit null once before restoring a persisted session in a
          // new tab — ignore that until authStateReady() confirms there is no user.
          if (!persistenceReady) return;
          useAuthStore.setState({ appUser: null, loading: false });
          return;
        }
        void syncAppUserFromFirebase(firebaseUser);
      });

      await auth.authStateReady();
      persistenceReady = true;
      if (!auth.currentUser) {
        useAuthStore.setState({ appUser: null, loading: false });
      }
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
  safeClearFingerprint();
  useAuthStore.setState({ appUser: null, loading: false });
}

export function clearAuthError(): void {
  useAuthStore.setState({ authError: null });
}
