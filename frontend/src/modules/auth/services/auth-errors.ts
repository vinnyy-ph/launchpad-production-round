const BENIGN_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

function getErrorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

export function getSignInErrorMessage(error: unknown): string {
  const code = getErrorCode(error);
  if (BENIGN_CODES.has(code)) {
    return "Sign-in was cancelled.";
  }

  return "Manage Jia couldn't sign you in. Try again.";
}

export function isBenignSignInCancel(error: unknown): boolean {
  return BENIGN_CODES.has(getErrorCode(error));
}

export function mapSignInError(error: unknown): "idle" | "error" {
  return isBenignSignInCancel(error) ? "idle" : "error";
}
