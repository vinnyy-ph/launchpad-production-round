/**
 * @jest-environment jsdom
 */

import { apiFetch } from "@/shared/lib/api-client";

jest.mock("firebase/auth", () => ({
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/shared/lib/firebase", () => ({
  getFirebaseAuth: () => ({
    currentUser: null,
  }),
}));

jest.mock("@/modules/auth/stores/auth.store", () => ({
  useAuthStore: {
    setState: jest.fn(),
  },
}));

const originalFetch = global.fetch;

function makeResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  return {
    ok: status < 400,
    status,
    statusText: "Status",
    headers: new Headers(),
    json: async () => body,
  } as Response;
}

function stubFetch(response: Response) {
  const spy = jest.fn((_url: string, _init?: RequestInit) => Promise.resolve(response));
  global.fetch = spy as unknown as typeof fetch;
  return spy;
}

describe("apiFetch (browser reauth)", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("forces re-auth + message on 401", async () => {
    stubFetch(makeResponse({ error: "Invalid or expired token" }, { status: 401 }));

    await expect(apiFetch("/api/x")).rejects.toThrow("Invalid or expired token");

    const { signOut } = await import("firebase/auth");
    const { useAuthStore } = await import("@/modules/auth/stores/auth.store");

    expect(useAuthStore.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        authError: expect.stringContaining("Please sign in again"),
      }),
    );
    expect(signOut).toHaveBeenCalled();
  });

  it("forces re-auth + message when access changes (403 permission)", async () => {
    stubFetch(
      makeResponse(
        { success: false, message: "You do not have permission to perform this action" },
        { status: 403 },
      ),
    );

    await expect(apiFetch("/api/x")).rejects.toThrow("You do not have permission to perform this action");

    const { signOut } = await import("firebase/auth");
    const { useAuthStore } = await import("@/modules/auth/stores/auth.store");

    expect(useAuthStore.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        authError: expect.stringContaining("Your access has changed"),
      }),
    );
    expect(signOut).toHaveBeenCalled();
  });
});

