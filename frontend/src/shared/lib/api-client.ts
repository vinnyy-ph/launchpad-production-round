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
    // A revoked/expired credential won't recover on retry — sign out so the auth
    // listener clears the session and routes back to /login instead of leaving stale UI.
    if (res.status === 401 && typeof window !== "undefined") {
      void (async () => {
        try {
          const [{ signOut }, { getFirebaseAuth }] = await Promise.all([
            import("firebase/auth"),
            import("./firebase"),
          ]);
          await signOut(getFirebaseAuth());
        } catch {
          // Already signed out or Firebase unavailable — nothing to clean up.
        }
      })();
    }
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      errorCode?: string;
      errors?: ApiFieldError[];
    };
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
