import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home, User, ClipboardList, CheckSquare, BarChart2,
  Users, UserPlus, UserMinus, LayoutGrid, Shield,
  ChevronRight, ChevronLeft, FileText, Rss,
  ChevronsUpDown,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { SwiftWorkLogo } from "@/shared/components/brand/swift-work-logo";
import type { Role } from "@/modules/auth/types/auth.types";
import { cn } from "@/shared/lib/utils";

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
      className={cn(
        "flex h-full flex-shrink-0 flex-col border-r border-[color:var(--border-primary)] transition-all duration-200 ease-in-out z-20 shadow-xs",
        expanded ? "w-[240px]" : "w-[72px]"
      )}
      style={{ background: "var(--gray-50)" }}
    >
      {/* Logo Section */}
      <div className={cn(
        "flex flex-shrink-0 transition-all duration-200",
        expanded ? "pt-4 pb-0 justify-center" : "h-14 items-center justify-center"
      )}>
        <SwiftWorkLogo tone="dark" size={32} markOnly={true} />
      </div>

      {/* Workspace Section */}
      {expanded && (
        <div className="px-5 mt-4 mb-6">
          <div className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-[inset_0_0_0_1px_rgb(233,234,235)] cursor-pointer hover:bg-[color:var(--gray-25)] transition-colors">
            <div 
              className="w-10 h-10 rounded-lg flex-shrink-0" 
              style={{ background: "var(--gradient-jia)" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[color:var(--text-primary)] truncate leading-tight">
                Blue Pixel Cloak
              </p>
            </div>
            <ChevronsUpDown size={16} className="text-[color:var(--text-tertiary)] flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => canSee(item.roles));
          if (visible.length === 0) return null;
          return (
            <div key={section.title || "home"} className="mb-4">
              {expanded && section.title && (
                <span className="block px-5 pb-1 text-[12px] font-bold uppercase tracking-[0.04em] text-[color:var(--text-quaternary)]">
                  {section.title}
                </span>
              )}
              <div className={cn("flex flex-col", expanded ? "px-2 pb-4" : "items-center")}>
                {visible.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center h-[36px] px-3 rounded-sm transition-all duration-100 group",
                        expanded ? "gap-2" : "w-10 justify-center",
                        active
                          ? "bg-[rgb(239,241,245)] text-[rgb(37,43,55)]"
                          : "text-[rgb(65,70,81)] hover:bg-[rgb(239,241,245)]"
                      )}
                    >
                      <Icon 
                        size={20} 
                        className={cn(
                          "flex-shrink-0 transition-colors",
                          active ? "text-[rgb(37,43,55)]" : "text-[#A4A7AE] group-hover:text-[rgb(37,43,55)]"
                        )} 
                      />
                      {expanded && (
                        <span className="truncate text-[14px] font-medium">
                          {item.label}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="mt-auto border-t border-[color:var(--border-primary)] p-2">
        {expanded && (
          <div className="px-4 py-3 text-center mb-1">
            <p className="text-[12px] font-medium text-[color:var(--text-tertiary)] leading-tight">
              © 2026 White Cloak Technologies, Inc.
            </p>
          </div>
        )}
        <button
          onClick={toggle}
          className="flex h-10 w-full items-center justify-center rounded-sm text-[color:var(--text-tertiary)] transition-colors hover:bg-[color:var(--gray-100)] hover:text-[color:var(--text-secondary)]"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </aside>
  );
}
