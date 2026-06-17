import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/shared/lib/firebase";

// Google SSO sign-in via popup. Resolves with the Firebase user credential.
export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}
