import { Bell } from "lucide-react";
import { Skeleton } from "@/shared/ui";
import { NotificationItem } from "./notification-item";
import type { Notification } from "../types/notifications.types";

interface Props {
  notifications: Notification[];
  loading: boolean;
  onRead: (id: string) => void;
}

export function NotificationDropdown({ notifications, loading, onRead }: Props) {
  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[color:var(--border-primary)] bg-white"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="border-b border-[color:var(--border-primary)] px-4 py-3">
        <span className="text-sm font-bold text-[color:var(--text-primary)]">
          Notifications
        </span>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                <Skeleton className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <Bell size={20} className="text-[color:var(--text-quaternary)]" />
            <p className="text-sm text-[color:var(--text-tertiary)]">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onRead={onRead} />
          ))
        )}
      </div>
    </div>
  );
}
