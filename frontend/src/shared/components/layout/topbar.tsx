"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, User } from "lucide-react";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import { breadcrumbForPath } from "./nav-config";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { signOutUser } from "@/modules/auth/services/auth.service";

const ROLE_ACRONYMS = new Set(["ADMIN", "HR"]);

/** Format a role enum for display: known acronyms uppercase (HR), others title-case. */
function formatRole(role: string): string {
  const upper = role.toUpperCase();
  if (ROLE_ACRONYMS.has(upper)) return upper;
  return upper.charAt(0) + upper.slice(1).toLowerCase();
}

function useClock(): string {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { appUser } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "/";
  const breadcrumb = breadcrumbForPath(pathname);
  const clock = useClock();

  const initials = appUser?.displayName
    ? appUser.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (appUser?.email?.[0] ?? "?").toUpperCase();

  const roleLabel = appUser?.role ? formatRole(appUser.role) : "";
  const shortName = appUser?.displayName
    ? appUser.displayName.split(" ").map((w, i) => (i === 0 ? w : w[0] + ".")).join(" ")
    : (appUser?.email ?? "");

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
    <header className="flex h-16 flex-shrink-0 items-center justify-between px-6 border-b border-[color:var(--border-primary)] bg-white">
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="text-[14px] text-[color:var(--text-tertiary)]" aria-hidden="true">›</span>
                )}
                <span
                  className={
                    i === breadcrumb.length - 1
                      ? "text-[14px] font-semibold text-[color:var(--text-primary)]"
                      : "text-[14px] font-medium text-[color:var(--text-tertiary)]"
                  }
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span aria-hidden="true" className="hidden sm:block text-[13px] font-medium tabular-nums text-[color:var(--text-tertiary)] select-none">
          {clock}
        </span>
        <NotificationBell />
        <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((p) => !p)}
          className="flex items-center gap-2 h-9 pl-1 pr-2.5 border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] rounded-full cursor-pointer transition-colors duration-150 hover:bg-[color:var(--bg-tertiary)]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Account menu"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold tracking-[0.01em] text-white flex-shrink-0"
            style={{ background: "#111322" }}
          >
            {initials}
          </span>
          <span className="hidden sm:block text-[13px] font-medium text-[color:var(--text-primary)] whitespace-nowrap">
            {shortName}{roleLabel ? ` · ${roleLabel}` : ""}
          </span>
          <ChevronDown size={14} className="flex-shrink-0 text-[color:var(--text-tertiary)]" aria-hidden="true" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <div className="border-b border-[color:var(--border-primary)] px-3 py-2.5">
              <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                {appUser?.displayName ?? appUser?.email ?? "Account"}
              </p>
              {appUser?.role && (
                <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                  {formatRole(appUser.role)}
                </p>
              )}
            </div>
            <button
              role="menuitem"
              onClick={() => { setMenuOpen(false); router.push("/employee/profile"); }}
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
