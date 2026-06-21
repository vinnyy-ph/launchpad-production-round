"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { hrDirectoryHref } from "@/modules/people/employees/directory-routes";
import type { Notification } from "../types/notifications.types";

interface Props {
  notification: Notification;
  onRead: (id: string) => void;
}

// The backend stamps `linkUrl`s that don't match the client routes (e.g.
// `/surveys/:id`, `/evaluations/:id`, `/clearance`, `/offboarding/me`), so
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
    case "CLEARANCE_REJECTED":
      return "/employee/clearance";
    case "OFFBOARDING_STARTED":
    case "OFFBOARDING_STATUS":
      return "/offboarding";
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

export function NotificationItem({ notification, onRead }: Props) {
  const router = useRouter();

  const handleClick = () => {
    if (!notification.isRead) onRead(notification.id);
    const route = resolveRoute(notification);
    if (route) router.push(route);
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
