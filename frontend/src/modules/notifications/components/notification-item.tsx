"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { parseISO, isToday, isYesterday, format, differenceInMinutes } from "date-fns";
import { cn } from "@/shared/lib/utils";
import type { Notification } from "../types/notifications.types";

/** Compact relative time: "Just now", "5m ago", "3h ago", "Yesterday", else "Jun 18". */
function relativeTime(iso: string): string {
  const d = parseISO(iso);
  const mins = differenceInMinutes(new Date(), d);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (isToday(d)) return `${Math.round(mins / 60)}h ago`;
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

interface Props {
  notification: Notification;
  onRead: (id: string) => void;
  /** When >1, the row stands in for this many identical notifications (e.g. repeated reminders). */
  groupCount?: number;
  /** "reminder" gives unread rows a warning-amber treatment so they read as a nudge, not a log. */
  tone?: "default" | "reminder";
}

// The backend stamps `linkUrl`s that don't match the client routes (e.g.
// `/surveys/:id`, `/evaluations/:id`, `/clearance`), so
// click-to-land is driven off the notification TYPE. Where the destination
// screen supports a deep-link query (the employee Performance hub expands the
// exact evaluation via `?tab=acknowledgements&eval=<id>`), the trailing id from
// the server `linkUrl` is reused. Unmapped types fall back to the server link.
function resolveRoute(n: Notification): string | null {
  const id = n.linkUrl?.split("/").filter(Boolean).pop();
  switch (n.type) {
    case "NEW_PULSE":
    case "PULSE_REMINDER":
      // The server stamps the OCCURRENCE id as the trailing segment of linkUrl;
      // the surveys page auto-opens that exact pulse via `?pulse=<occurrenceId>`.
      return id ? `/employee/surveys?tab=survey&pulse=${id}` : "/employee/surveys";
    case "NEW_EVALUATION":
    case "EVAL_ACK_REMINDER":
      return id
        ? `/employee/surveys?tab=acknowledgements&eval=${id}`
        : "/employee/surveys?tab=acknowledgements";
    case "EVAL_DEEMED_ACK":
      // Sent to both parties under one type; the reviewer's copy carries a /supervisor
      // linkUrl, the reviewee's an /evaluations/:id link — route off that prefix.
      if (n.linkUrl?.startsWith("/supervisor")) return "/supervisor/evaluations";
      return id
        ? `/employee/surveys?tab=acknowledgements&eval=${id}`
        : "/employee/surveys?tab=acknowledgements";
    case "CLEARANCE_SIGN_REQUEST":
      return "/employee/clearance";
    case "CLEARANCE_REJECTED":
      if (n.linkUrl?.startsWith("/hr/directory/offboarding")) return n.linkUrl;
      return "/employee/clearance";
    case "OFFBOARDING_STARTED":
      return "/offboarding";
    case "OFFBOARDING_STATUS":
      return "/supervisor/status";
    case "ONBOARDING_INVITE":
      return "/employee/onboarding";
    case "ONBOARDING_COMPLETE":
      return "/hr/directory";
    case "ONBOARDING_STATUS": {
      const url = n.linkUrl;
      if (url?.startsWith("/hr/directory/onboarding")) return url;
      // Rewrite links saved before onboarding moved under the People directory.
      if (url?.startsWith("/hr/onboarding")) {
        return url.replace("/hr/onboarding", "/hr/directory/onboarding");
      }
      return "/hr/directory";
    }
    default:
      return n.linkUrl?.startsWith("/") ? n.linkUrl : null;
  }
}

export function NotificationItem({ notification, onRead, groupCount, tone = "default" }: Props) {
  const router = useRouter();
  const isReminder = tone === "reminder" && !notification.isRead;

  const handleClick = () => {
    if (!notification.isRead) onRead(notification.id);
    const route = resolveRoute(notification);
    if (route) router.push(route);
  };

  const subject =
    groupCount && groupCount > 1 ? `${notification.subject} — ${groupCount} reminders` : notification.subject;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
        isReminder
          ? "bg-[color:var(--color-warning-50)] hover:brightness-[0.97]"
          : "hover:bg-[color:var(--bg-secondary)]",
      )}
    >
      <span
        className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{
          background: isReminder
            ? "var(--color-warning-600)"
            : notification.isRead
              ? "var(--border-secondary)"
              : "var(--gray-neutral-900)",
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
          {subject}
        </p>
        <p className="truncate text-xs text-[color:var(--text-tertiary)]">
          {notification.body}
        </p>
      </div>
      <time
        dateTime={notification.createdAt}
        className="mt-px flex-shrink-0 whitespace-nowrap text-[11px] text-[color:var(--text-quaternary)]"
      >
        {relativeTime(notification.createdAt)}
      </time>
      <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-[color:var(--text-quaternary)]" />
    </button>
  );
}
