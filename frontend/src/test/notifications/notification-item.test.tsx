import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationItem } from "@/modules/notifications/components/notification-item";
import type { Notification } from "@/modules/notifications/types/notifications.types";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notification-id",
    type: "OFFBOARDING_STATUS",
    subject: "Employee in your hierarchy is offboarding",
    body: "Blake Rivera has started offboarding.",
    linkUrl: "/supervisor/status",
    isRead: false,
    isPinned: false,
    pinnedAt: null,
    createdAt: "2026-06-22T00:00:00.000Z",
    ...overrides,
  };
}

describe("NotificationItem", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("routes supervisor offboarding status notifications to hierarchy status", () => {
    const onRead = jest.fn();
    render(<NotificationItem notification={notification()} onRead={onRead} />);

    fireEvent.click(screen.getByRole("button", { name: /employee in your hierarchy/i }));

    expect(onRead).toHaveBeenCalledWith("notification-id");
    expect(mockPush).toHaveBeenCalledWith("/supervisor/status");
  });

  it("routes HR clearance rejection notifications to the rejected offboarding case", () => {
    const onRead = jest.fn();
    render(
      <NotificationItem
        notification={notification({
          type: "CLEARANCE_REJECTED",
          subject: "Clearance rejected",
          body: "A signatory rejected Blake Rivera's clearance.",
          linkUrl: "/hr/directory/offboarding/offboarding-id",
        })}
        onRead={onRead}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /clearance rejected/i }));

    expect(onRead).toHaveBeenCalledWith("notification-id");
    expect(mockPush).toHaveBeenCalledWith("/hr/directory/offboarding/offboarding-id");
  });
});
