jest.mock("@/shared/lib/api-client", () => ({
  apiFetch: jest.fn(() =>
    Promise.resolve({ success: true, message: "ok", data: [] }),
  ),
}));

import { apiFetch } from "@/shared/lib/api-client";
import {
  fetchNotifications,
  markNotificationRead,
} from "@/modules/notifications/services/notifications.service";

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("notifications service", () => {
  afterEach(() => jest.clearAllMocks());

  it("lists notifications scoped to the caller, returning the response data", async () => {
    const rows = [
      { id: "n1", type: "NEW_PULSE", subject: "s", body: "b", linkUrl: null, isRead: false, createdAt: "2026-06-16T09:00:00.000Z" },
    ];
    mockedApiFetch.mockResolvedValueOnce({ success: true, message: "ok", data: rows });

    const list = await fetchNotifications("e-emp", 5);

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/v1/notifications?limit=5");
    expect(list).toEqual(rows);
  });

  it("defaults the limit to 10 when not given", async () => {
    await fetchNotifications("e-emp");
    expect(mockedApiFetch).toHaveBeenCalledWith("/api/v1/notifications?limit=10");
  });

  it("marks a notification read via PATCH", async () => {
    await markNotificationRead("n1");
    expect(mockedApiFetch).toHaveBeenCalledWith("/api/v1/notifications/n1/read", {
      method: "PATCH",
    });
  });
});
