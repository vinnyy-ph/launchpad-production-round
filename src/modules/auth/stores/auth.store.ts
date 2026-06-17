import { create } from "zustand";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/shared/lib/firebase";
import { apiFetch } from "@/shared/lib/api-client";
import type { AppUser } from "../types/auth.types";

interface AuthStore {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
}

let inflightSession: { uid: string; promise: Promise<AppUser> } | null = null;
let listenerStarted = false;

function fetchAppSession(firebaseUser: User): Promise<AppUser> {
  if (inflightSession?.uid === firebaseUser.uid) {
    return inflightSession.promise;
  }

  const promise = apiFetch<AppUser>("/api/auth/session", { method: "POST" });
  inflightSession = { uid: firebaseUser.uid, promise };

  return promise.finally(() => {
    if (inflightSession?.promise === promise) {
      inflightSession = null;
    }
  });
}

export const useAuthStore = create<AuthStore>(() => ({
  user: null,
  appUser: null,
  loading: true,
}));

export function initAuthListener() {
  if (listenerStarted) return;
  listenerStarted = true;

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      useAuthStore.setState({ user: null, appUser: null, loading: false });
      return;
    }

    useAuthStore.setState({ loading: true });
    try {
      const session = await fetchAppSession(firebaseUser);
      useAuthStore.setState({ user: firebaseUser, appUser: session, loading: false });
    } catch {
      await signOut(auth);
      useAuthStore.setState({ user: null, appUser: null, loading: false });
    }
  });
}
