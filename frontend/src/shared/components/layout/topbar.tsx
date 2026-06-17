import { useState, useRef, useEffect } from "react";
"use client";

import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, Search, Menu, User } from "lucide-react";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { signOutUser } from "@/modules/auth/services/auth.service";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { appUser } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = appUser?.displayName
    ? appUser.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (appUser?.email?.[0] ?? "?").toUpperCase();

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
      {/* Left: Workspace Identity */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: "#181D27" }}
        />
        <span className="text-[16px] font-bold tracking-[-0.01em] text-[#181d27] whitespace-nowrap">
          SwiftWork
        </span>
      </div>

      {/* Center: Search */}
      <div className="flex-1 flex justify-center px-4">
        <label className="relative flex items-center w-full max-w-[460px]">
          <Search
            size={18}
            className="absolute left-3 text-[color:var(--text-tertiary)] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search people, teams, surveys…"
            aria-label="Search"
            disabled
            title="Search coming soon"
            className="w-full h-10 pl-[38px] pr-3.5 text-[14px] font-medium text-[color:var(--text-primary)] bg-white border border-[color:var(--border-secondary)] rounded-lg outline-none shadow-[var(--shadow-inset-brand)] cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <NotificationBell />
        <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((p) => !p)}
          className="flex items-center gap-2 h-10 pl-1 pr-2 bg-transparent border border-transparent rounded-full cursor-pointer transition-colors duration-150 hover:bg-[color:var(--bg-secondary)]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--gray-neutral-900)] text-[13px] font-bold tracking-[0.01em] text-white flex-shrink-0">
            {initials}
          </span>
          <ChevronDown size={16} className="text-[color:var(--text-tertiary)]" />
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
                  {appUser.role.charAt(0) + appUser.role.slice(1).toLowerCase()}
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
