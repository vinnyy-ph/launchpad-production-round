import { clearSession } from "../stores/auth.store";

// Real Google SSO via Firebase popup. Firebase is imported dynamically so it
// never loads during SSR/prerender (no env vars at build time). On success, the
// auth-state listener in auth.store exchanges the token for the real backend session.
// `rememberMe` controls Firebase persistence: local (survives browser close) vs session.
export async function signInWithGoogle(rememberMe: boolean) {
  const {
    signInWithPopup,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
  } = await import("firebase/auth");
  const { getFirebaseAuth, googleProvider } = await import("@/shared/lib/firebase");
  const auth = getFirebaseAuth();
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence,
  );
  return signInWithPopup(auth, googleProvider);
}

// Sign out of Firebase and drop the persisted demo view; the auth-state
// listener then clears appUser.
export async function signOutUser(): Promise<void> {
  const { signOut } = await import("firebase/auth");
  const { getFirebaseAuth } = await import("@/shared/lib/firebase");
  await signOut(getFirebaseAuth());
  clearSession();
}
