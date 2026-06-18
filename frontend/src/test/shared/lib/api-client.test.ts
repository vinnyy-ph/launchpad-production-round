/**
 * @jest-environment node
 */

import { apiFetch } from "@/shared/lib/api-client";

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

describe("apiFetch", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns parsed JSON on a 200", async () => {
    stubFetch(makeResponse({ ok: true }));
    await expect(apiFetch("/api/x")).resolves.toEqual({ ok: true });
  });

  it("returns undefined for a 204 without parsing the body", async () => {
    const noBody = {
      ok: true,
      status: 204,
      statusText: "No Content",
      headers: new Headers(),
      json: async () => {
        throw new Error("should not parse a 204 body");
      },
    } as unknown as Response;
    stubFetch(noBody);
    await expect(apiFetch("/api/x", { method: "PATCH" })).resolves.toBeUndefined();
  });

  it("omits the JSON Content-Type for FormData bodies", async () => {
    const spy = stubFetch(makeResponse({ ok: true }));
    await apiFetch("/api/upload", { method: "POST", body: new FormData() });
    const init = spy.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("throws the server-provided message on a non-OK response", async () => {
    stubFetch(makeResponse({ message: "Nope" }, { status: 400 }));
    await expect(apiFetch("/api/x")).rejects.toThrow("Nope");
  });
});
