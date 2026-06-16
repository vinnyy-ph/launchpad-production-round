import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home, User, ClipboardList, CheckSquare, BarChart2,
  Users, UserPlus, UserMinus, LayoutGrid, Shield,
  ChevronRight, ChevronLeft, FileText, Rss,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { SwiftWorkLogo } from "@/shared/components/brand/swift-work-logo";
import type { Role } from "@/modules/auth/types/auth.types";

type AllowedRole = Role | "SUPERVISOR" | "ALL";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  roles: AllowedRole[];
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "",
    items: [
      { label: "Home", icon: Home, href: "/", roles: ["ALL"] },
    ],
  },
  {
    title: "My Work",
    items: [
      { label: "My Profile", icon: User, href: "/employee/profile", roles: ["EMPLOYEE", "SUPERVISOR"] },
      { label: "My Onboarding", icon: ClipboardList, href: "/employee/onboarding", roles: ["EMPLOYEE", "SUPERVISOR"] },
      { label: "My Clearance", icon: CheckSquare, href: "/employee/clearance", roles: ["EMPLOYEE", "SUPERVISOR"] },
      { label: "My Surveys", icon: BarChart2, href: "/employee/surveys", roles: ["ALL"] },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Directory", icon: Users, href: "/hr/directory", roles: ["HR", "ADMIN"] },
      { label: "Onboarding", icon: UserPlus, href: "/hr/onboarding", roles: ["HR", "ADMIN"] },
      { label: "Offboarding", icon: UserMinus, href: "/hr/offboarding", roles: ["HR", "ADMIN"] },
      { label: "Teams", icon: LayoutGrid, href: "/hr/teams", roles: ["HR", "ADMIN"] },
    ],
  },
  {
    title: "Performance",
    items: [
      { label: "Evaluations", icon: FileText, href: "/supervisor/evaluations", roles: ["SUPERVISOR", "ADMIN"] },
      { label: "My Reports", icon: BarChart2, href: "/supervisor/reports", roles: ["SUPERVISOR", "ADMIN"] },
      { label: "Surveys", icon: Rss, href: "/hr/surveys", roles: ["HR", "ADMIN"] },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users", icon: Shield, href: "/admin/users", roles: ["ADMIN"] },
    ],
  },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState<boolean>(() => {
    return localStorage.getItem("sidebar-expanded") !== "false";
  });
  const { appUser } = useAuth();
  const location = useLocation();

  const toggle = () => {
    setExpanded((prev) => {
      localStorage.setItem("sidebar-expanded", String(!prev));
      return !prev;
    });
  };

  const canSee = (roles: AllowedRole[]) => {
    if (!appUser) return false;
    if (roles.includes("ALL")) return true;
    if (roles.includes(appUser.role)) return true;
    if (roles.includes("SUPERVISOR") && appUser.isSupervisor) return true;
    return false;
  };

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  return (
    <aside
      className="flex h-full flex-shrink-0 flex-col border-r border-[color:var(--border-primary)] transition-all duration-200"
      style={{ width: expanded ? 220 : 52, background: "var(--bg-secondary)" }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center px-3 border-b border-[color:var(--border-primary)]">
        {expanded ? (
          <SwiftWorkLogo tone="dark" size={28} />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--gray-neutral-900)] flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 40 40" aria-hidden="true">
              <g fill="#FFFFFF">
                <rect x="12" y="22" width="4.2" height="8" rx="2.1" />
                <rect x="17.9" y="16.5" width="4.2" height="13.5" rx="2.1" />
                <rect x="23.8" y="11" width="4.2" height="19" rx="2.1" />
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => canSee(item.roles));
          if (visible.length === 0) return null;
          return (
            <div key={section.title || "home"} className="mb-1">
              {expanded && section.title && (
                <span className="block px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">
                  {section.title}
                </span>
              )}
              {visible.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    title={!expanded ? item.label : undefined}
                    className={[
                      "mx-1 flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                      active
                        ? "bg-white font-medium text-[color:var(--text-primary)] shadow-[var(--shadow-xs)]"
                        : "text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-tertiary)] hover:text-[color:var(--text-primary)]",
                    ].join(" ")}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {expanded && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Expand/collapse toggle */}
      <button
        onClick={toggle}
        className="flex h-10 w-full items-center justify-center border-t border-[color:var(--border-primary)] text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-secondary)]"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </aside>
  );
}
