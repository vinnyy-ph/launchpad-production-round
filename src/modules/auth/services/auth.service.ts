import { setView, clearSession } from "../stores/auth.store";
import { DEFAULT_VIEW } from "@/shared/mock/identity";

// Fake Google sign-in: no popup, no Firebase. Drops you into the default
// demo view; the /login guard then redirects to that role's home.
export async function signInWithGoogle(): Promise<void> {
  setView(DEFAULT_VIEW);
}

// Cold-start demo: sign in as a brand-new hire. The /login guard redirects to
// the onboarding wizard (roleHome → /employee/onboarding for ONBOARDING status).
export async function signInAsNewHire(): Promise<void> {
  setView("NEWHIRE");
}

export async function signOutUser(): Promise<void> {
  clearSession();
}
