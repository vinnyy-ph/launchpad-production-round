import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronDown } from "lucide-react";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { signOutUser } from "@/lib/auth";

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
    <header className="flex h-14 flex-shrink-0 items-center justify-end gap-1 border-b border-[color:var(--border-primary)] bg-white px-4">
      <NotificationBell />
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[color:var(--bg-secondary)]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0a] text-[11px] font-bold text-white">
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
    </header>
  );
}
