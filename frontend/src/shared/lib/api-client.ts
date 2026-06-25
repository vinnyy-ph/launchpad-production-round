// Reads the current Firebase ID token (client-side only) so every API call carries a
// Bearer credential the backend `authenticate` middleware can verify. Returns null on
// the server or when signed out.
async function getIdToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { getFirebaseAuth } = await import("./firebase");
    const user = getFirebaseAuth().currentUser;
    return user ? await user.getIdToken() : null;
  } catch {
    return null;
  }
}

/** One field-level validation error returned by the API in an error response `errors` array. */
export interface ApiFieldError {
  field?: string;
  message?: string;
  code?: string;
}

/**
 * Error thrown for non-2xx API responses. Carries the structured details (errorCode and
 * field-level errors) so callers can map specific failures to user-friendly messages without
 * parsing the raw response again. `message` stays the top-level message for generic display.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly fieldErrors: ApiFieldError[];

  constructor(
    message: string,
    status: number,
    errorCode?: string,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.fieldErrors = fieldErrors;
  }
}

const ACCESS_CHANGED_MESSAGE =
  "Your access has changed. Please sign in again to continue.";

async function forceReauth(message: string): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const [{ signOut }, { getFirebaseAuth }, { useAuthStore }] = await Promise.all([
      import("firebase/auth"),
      import("./firebase"),
      import("@/modules/auth/stores/auth.store"),
    ]);

    // Put the message directly on the login screen. (LoginPage already renders authError.)
    useAuthStore.setState({ authError: message, loading: false, appUser: null });

    await signOut(getFirebaseAuth());
  } catch {
    // Best-effort. If Firebase isn't available, RequireAuth will still route to /login.
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const token = await getIdToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      errorCode?: string;
      errors?: ApiFieldError[];
    };

    // If the backend tells us the token is invalid, or the account is blocked, or the
    // user's permissions changed mid-session, force a clean re-auth with an obvious message.
    const serverMessage = body.message ?? body.error ?? "";
    const mustReauth =
      res.status === 401 ||
      (res.status === 403 &&
        typeof serverMessage === "string" &&
        (serverMessage.includes("Account deactivated") ||
          serverMessage.includes("Account is inactive") ||
          serverMessage.includes("No account for this email") ||
          serverMessage.includes("linked to a different Google identity") ||
          serverMessage === "You do not have permission to perform this action"));

    if (mustReauth) {
      void forceReauth(
        typeof serverMessage === "string" && serverMessage.trim()
          ? `${ACCESS_CHANGED_MESSAGE} (${serverMessage.trim()})`
          : ACCESS_CHANGED_MESSAGE,
      );
    }

    throw new ApiError(
      body.message ?? body.error ?? res.statusText,
      res.status,
      body.errorCode,
      body.errors ?? [],
    );
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/** Authenticated API call — prepends NEXT_PUBLIC_API_URL and attaches Firebase Bearer token. */
export async function authFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { getFirebaseAuth } = await import("./firebase");
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not authenticated");

  const token = await user.getIdToken();
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

  return apiFetch<T>(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  });
}
