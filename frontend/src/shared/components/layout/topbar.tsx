"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  LogOut,
  Menu,
  Network,
  User,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { signOutUser } from "@/modules/auth/services/auth.service";
import { Button } from "@/shared/ui";
import { UserAvatar } from "@/shared/ui/primitives/user-avatar";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import { breadcrumbForPath, findNav, type NavIcon } from "./nav-config";
import { useExtraBreadcrumbs } from "./breadcrumb-context";

const ROLE_ACRONYMS = new Set(["ADMIN", "HR"]);
const TOPBAR_HISTORY_KEY = "swiftwork:topbar-history";

interface TopbarHistoryState {
  stack: string[];
  index: number;
}

/** Format a role enum for display: known acronyms uppercase (HR), others title-case. */
function formatRole(role: string): string {
  const upper = role.toUpperCase();
  if (ROLE_ACRONYMS.has(upper)) return upper;
  return upper.charAt(0) + upper.slice(1).toLowerCase();
}

function formatTopbarDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function useClock(): { time: string; date: string } {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return {
    time: now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }),
    date: formatTopbarDate(now),
  };
}

function iconForPath(pathname: string): LucideIcon | NavIcon {
  const navMatch = findNav(pathname);
  if (navMatch) return navMatch.item.icon;

  if (pathname.startsWith("/employee/profile")) return User;
  if (pathname.startsWith("/employee/onboarding") || pathname.startsWith("/hr/directory/onboarding")) {
    return ClipboardList;
  }
  if (pathname.startsWith("/employee/clearance")) return ClipboardCheck;
  if (pathname.startsWith("/offboarding") || pathname.startsWith("/hr/directory/offboarding")) return LogOut;
  if (pathname.startsWith("/supervisor/status")) return Network;

  return BriefcaseBusiness;
}

function readTopbarHistory(): TopbarHistoryState {
  if (typeof window === "undefined") return { stack: [], index: -1 };

  try {
    const stored = window.sessionStorage.getItem(TOPBAR_HISTORY_KEY);
    if (!stored) return { stack: [], index: -1 };
    const parsed = JSON.parse(stored) as TopbarHistoryState;
    if (!Array.isArray(parsed.stack) || typeof parsed.index !== "number") {
      return { stack: [], index: -1 };
    }
    return parsed;
  } catch {
    return { stack: [], index: -1 };
  }
}

function writeTopbarHistory(history: TopbarHistoryState) {
  window.sessionStorage.setItem(TOPBAR_HISTORY_KEY, JSON.stringify(history));
}

function useTopbarHistory(pathname: string): { canGoBack: boolean; canGoForward: boolean } {
  const [navigationState, setNavigationState] = useState({
    canGoBack: false,
    canGoForward: false,
  });

  useEffect(() => {
    const current = readTopbarHistory();
    let next = current;

    if (current.stack[current.index] === pathname) {
      next = current;
    } else if (current.stack[current.index - 1] === pathname) {
      next = { stack: current.stack, index: current.index - 1 };
    } else if (current.stack[current.index + 1] === pathname) {
      next = { stack: current.stack, index: current.index + 1 };
    } else {
      const stack = current.stack.slice(0, current.index + 1);
      stack.push(pathname);
      next = { stack, index: stack.length - 1 };
    }

    writeTopbarHistory(next);
    setNavigationState({
      canGoBack: next.index > 0,
      canGoForward: next.index < next.stack.length - 1,
    });
  }, [pathname]);

  return navigationState;
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { appUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const extraCrumbs = useExtraBreadcrumbs();
  // The directory's Onboarding/Offboarding tabs live in the `?tab=` query, so pass it through
  // for the breadcrumb to resolve the active sub-tab on the list view.
  const breadcrumb = [
    ...breadcrumbForPath(pathname, searchParams.get("tab")),
    ...extraCrumbs.map((label) => ({ label, href: undefined })),
  ];
  const clock = useClock();
  const TopbarIcon = iconForPath(pathname);
  const { canGoBack, canGoForward } = useTopbarHistory(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = appUser?.displayName
    ? appUser.displayName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (appUser?.email?.[0] ?? "?").toUpperCase();

  const displayName = appUser?.displayName ?? appUser?.email ?? "Account";
  const roleLabel = appUser?.role ? formatRole(appUser.role) : "";

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/login");
  };

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between gap-4 border-b border-[color:var(--border-primary)] bg-white px-5">
      <div className="flex min-w-0 flex-shrink items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="rounded-lg text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)] lg:hidden"
          aria-label="Open menu"
        >
          <Menu />
        </Button>

        <div className="hidden items-center gap-1 lg:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => router.back()}
            disabled={!canGoBack}
            className="h-8 w-8 rounded-full text-[color:var(--text-tertiary)] hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[color:var(--text-tertiary)]"
            aria-label="Go back"
          >
            <ChevronLeft strokeWidth={1.8} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => router.forward()}
            disabled={!canGoForward}
            className="h-8 w-8 rounded-full text-[color:var(--text-tertiary)] hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[color:var(--text-tertiary)]"
            aria-label="Go forward"
          >
            <ChevronRight strokeWidth={1.8} />
          </Button>
        </div>

        <span className="hidden h-6 w-px bg-[color:var(--border-primary)] lg:block" aria-hidden="true" />
        <TopbarIcon
          size={19}
          strokeWidth={1.8}
          className="hidden flex-shrink-0 text-[color:var(--text-primary)] sm:block"
          aria-hidden="true"
        />

        {breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
            {breadcrumb.map((crumb, i) => {
              const isLast = i === breadcrumb.length - 1;
              const className = isLast
                ? "min-w-0 truncate rounded-lg bg-[color:var(--bg-secondary)] px-3 py-2 text-[14px] font-semibold text-[color:var(--text-primary)]"
                : "hidden text-[14px] font-semibold text-[color:var(--text-tertiary)] sm:inline";

              return (
                <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-2">
                  {i > 0 && (
                    <ChevronRight
                      size={15}
                      strokeWidth={1.8}
                      className="flex-shrink-0 text-[color:var(--text-tertiary)]"
                      aria-hidden="true"
                    />
                  )}
                  {crumb.href ? (
                    <button
                      type="button"
                      onClick={() => router.push(crumb.href!)}
                      aria-current={isLast ? "page" : undefined}
                      className={`${className} cursor-pointer rounded-lg transition-colors hover:text-[color:var(--text-primary)]`}
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className={className}>{crumb.label}</span>
                  )}
                </span>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="hidden whitespace-nowrap text-[14px] font-medium tabular-nums text-[color:var(--text-secondary)] select-none xl:block"
        >
          <span className="text-[color:var(--text-primary)] mr-2">{clock.time}</span> {clock.date}
        </span>

        <NotificationBell />

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="flex h-11 items-center gap-2.5 rounded-full border border-transparent bg-white pl-1 pr-1.5 transition-colors hover:bg-[color:var(--bg-secondary)]"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            <UserAvatar
              src={appUser?.avatarUrl}
              fallback={initials}
              className="h-9 w-9 border-2 border-[#C9D7FF]"
              fallbackClassName="text-[12px] font-bold tracking-[0.01em] text-white"
              fallbackStyle={{ background: "linear-gradient(135deg, #1f2a5c 0%, #4f46e5 100%)" }}
            />
            <span className="hidden min-w-0 text-left md:block">
              <span className="block max-w-[180px] truncate text-[14px] font-semibold leading-4 text-[color:var(--text-primary)]">
                {displayName}
              </span>
              {roleLabel && (
                <span className="block max-w-[180px] truncate text-[12px] font-medium leading-4 text-[color:var(--text-secondary)]">
                  {roleLabel}
                </span>
              )}
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
              style={{ boxShadow: "var(--shadow-md)" }}
            >
              <div className="border-b border-[color:var(--border-primary)] px-3 py-2.5">
                <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                  {displayName}
                </p>
                {appUser?.role && (
                  <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                    {formatRole(appUser.role)}
                  </p>
                )}
              </div>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/employee/profile");
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
              >
                <User size={14} />
                My profile
              </button>
              <button
                role="menuitem"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
