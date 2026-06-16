import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronDown } from "lucide-react";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { signOutUser } from "@/modules/auth/services/auth.service";

export function Topbar() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
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
    navigate("/login");
  };

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between px-6 border-b border-[color:var(--border-primary)] bg-white">
      {/* Left: Workspace Identity */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <span 
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: "var(--gradient-jia)" }}
        />
        <span className="text-[16px] font-bold tracking-[-0.01em] text-[#181d27] whitespace-nowrap">
          Swift Work
        </span>
      </div>

      {/* Placeholder for Center (Task 4) */}
      <div className="flex-1 flex justify-center px-4" />

      {/* Right: Controls (Existing logic, styled in Task 5) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <NotificationBell />
        <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[color:var(--bg-secondary)]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--gray-neutral-900)] text-[11px] font-bold text-white">
            {initials}
          </span>
          <span className="hidden max-w-[120px] truncate text-xs font-medium text-[color:var(--text-primary)] sm:block">
            {appUser?.displayName ?? appUser?.email}
          </span>
          <ChevronDown size={12} className="text-[color:var(--text-tertiary)]" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-[color:var(--border-primary)] bg-white"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <button
              role="menuitem"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
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
