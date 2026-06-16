import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { NotificationDropdown } from "./notification-dropdown";
import { useNotifications } from "../hooks/use-notifications";
import { useMarkRead } from "../hooks/use-mark-read";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, loading, unreadCount, reload } = useNotifications(10);
  const { markRead } = useMarkRead(() => void reload());

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[color:var(--text-secondary)] bg-transparent transition-colors duration-150 hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-primary)]"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--gray-neutral-900)] text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          onRead={markRead}
        />
      )}
    </div>
  );
}
