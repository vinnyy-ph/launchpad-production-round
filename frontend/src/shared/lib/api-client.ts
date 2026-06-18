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
    const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(body.message ?? body.error ?? res.statusText);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
