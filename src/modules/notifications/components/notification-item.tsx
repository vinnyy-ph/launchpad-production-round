"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Notification } from "../types/notifications.types";

interface Props {
  notification: Notification;
  onRead: (id: string) => void;
}

export function NotificationItem({ notification, onRead }: Props) {
  const router = useRouter();

  const handleClick = () => {
    if (!notification.isRead) onRead(notification.id);
    if (notification.linkUrl && notification.linkUrl.startsWith("/")) {
      router.push(notification.linkUrl);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--bg-secondary)]"
    >
      <span
        className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{
          background: notification.isRead
            ? "var(--border-secondary)"
            : "var(--gray-neutral-900)",
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
          {notification.subject}
        </p>
        <p className="truncate text-xs text-[color:var(--text-tertiary)]">
          {notification.body}
        </p>
      </div>
      <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-[color:var(--text-quaternary)]" />
    </button>
  );
}
