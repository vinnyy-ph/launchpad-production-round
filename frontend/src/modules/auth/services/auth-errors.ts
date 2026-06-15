/**
 * Maps a Firebase sign-in rejection to the login's next state.
 * Benign user-driven cancels return to "idle" (no scary alert);
 * everything else surfaces the inline error.
 */
const BENIGN_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

export function mapSignInError(error: unknown): "idle" | "error" {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return BENIGN_CODES.has(code) ? "idle" : "error";
}
