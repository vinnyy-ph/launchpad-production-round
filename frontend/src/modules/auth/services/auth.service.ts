import { clearSession } from "../stores/auth.store";

// Real Google SSO via Firebase popup. Firebase is imported dynamically so it
// never loads during SSR/prerender (no env vars at build time). On success, the
// auth-state listener in auth.store exchanges the token for the real backend session.
export async function signInWithGoogle() {
  const { signInWithPopup } = await import("firebase/auth");
  const { getFirebaseAuth, googleProvider } = await import("@/shared/lib/firebase");
  return signInWithPopup(getFirebaseAuth(), googleProvider);
}

// Sign out of Firebase and drop the persisted demo view; the auth-state
// listener then clears appUser.
export async function signOutUser(): Promise<void> {
  const { signOut } = await import("firebase/auth");
  const { getFirebaseAuth } = await import("@/shared/lib/firebase");
  await signOut(getFirebaseAuth());
  clearSession();
}
