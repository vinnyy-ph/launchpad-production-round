export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? res.statusText);
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
