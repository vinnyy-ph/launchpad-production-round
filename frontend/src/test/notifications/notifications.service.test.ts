import {
  fetchNotifications,
  markNotificationRead,
} from "@/modules/notifications/services/notifications.service";
import { resetDemo } from "@/shared/mock/db";

describe("notifications service (mock)", () => {
  beforeEach(() => resetDemo());

  it("returns the recipient's notifications, newest first", async () => {
    const list = await fetchNotifications("e-emp", 10);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].createdAt >= list[1].createdAt).toBe(true);
  });

  it("marks a notification read and persists it", async () => {
    const before = await fetchNotifications("e-emp", 10);
    const target = before.find((n) => !n.isRead)!;
    await markNotificationRead(target.id);
    const after = await fetchNotifications("e-emp", 10);
    expect(after.find((n) => n.id === target.id)!.isRead).toBe(true);
  });
});
