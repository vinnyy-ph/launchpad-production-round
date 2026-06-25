"use client";

import { useState } from "react";
import { Bell, CheckCheck, Trash2, MoreVertical } from "lucide-react";
import { Button, Skeleton } from "@/shared/ui";
import { NotificationItem } from "./notification-item";
import type { Notification } from "../types/notifications.types";

interface Props {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  onRead: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onClear: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

const HEADER_BTN =
  "px-1.5 text-[color:var(--text-tertiary)] hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-secondary)]";

export function NotificationDropdown({
  notifications,
  loading,
  unreadCount,
  onRead,
  onPin,
  onClear,
  onMarkAllRead,
  onClearAll,
}: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const hasItems = notifications.length > 0;

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,400px)] overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border-primary)] px-4 py-3">
        <span className="text-sm font-bold text-[color:var(--text-primary)]">Notifications</span>
        {hasItems && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-xs"
              className={HEADER_BTN}
              aria-label="Notification actions"
              aria-haspopup="menu"
              aria-expanded={actionsOpen}
              onClick={() => setActionsOpen((o) => !o)}
            >
              <MoreVertical aria-hidden="true" />
            </Button>
            {actionsOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-[color:var(--border-primary)] bg-white py-1"
                style={{ boxShadow: "var(--shadow-md)" }}
              >
                {unreadCount > 0 && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onMarkAllRead();
                      setActionsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
                  >
                    <CheckCheck size={15} aria-hidden="true" /> Mark all read
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setConfirmClear(true);
                    setActionsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[color:var(--color-error-700)] transition-colors hover:bg-[color:var(--color-error-50)]"
                >
                  <Trash2 size={15} aria-hidden="true" /> Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmClear && (
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-4 py-2.5">
          <span className="text-xs text-[color:var(--text-secondary)]">
            Clear all unpinned notifications?
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setConfirmClear(false)}
              className="text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-tertiary)]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={() => {
                onClearAll();
                setConfirmClear(false);
              }}
            >
              Clear all
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-[420px] overflow-y-auto">
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
        ) : !hasItems ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <Bell size={20} className="text-[color:var(--text-quaternary)]" />
            <p className="text-sm text-[color:var(--text-tertiary)]">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--border-primary)]">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={onRead}
                onPin={onPin}
                onClear={onClear}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
