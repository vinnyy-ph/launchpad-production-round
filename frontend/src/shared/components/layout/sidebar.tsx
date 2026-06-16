import { NavLink, useLocation } from "react-router-dom";
import {
  Home, User, ClipboardList, CheckSquare, BarChart2,
  Users, UserPlus, UserMinus, LayoutGrid, Shield,
  FileText, Rss,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
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
  const { appUser } = useAuth();
  const location = useLocation();

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
      className="flex h-full w-[240px] flex-shrink-0 flex-col border-r border-[color:var(--border-primary)] z-20"
      style={{ background: "var(--gray-50)" }}
    >
      {/* Workspace Section (Logomark) */}
      <div className="px-5 mt-[20px] mb-6">
        <div className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-[inset_0_0_0_1px_rgb(233,234,235)]">
          <div 
            className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" 
            style={{ background: "var(--gradient-jia)" }}
          >
            <span className="text-white font-bold text-[15px] tracking-[0.01em] leading-none font-sans">
              SW
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[color:var(--text-primary)] truncate leading-tight">
              Swift Work
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => canSee(item.roles));
          if (visible.length === 0) return null;
          return (
            <div key={section.title || "home"} className="mb-4">
              {section.title && (
                <span className="block px-5 pb-1 text-[12px] font-bold uppercase tracking-[0.04em] text-[color:var(--text-quaternary)]">
                  {section.title}
                </span>
              )}
              <div className="flex flex-col px-2 pb-4">
                {visible.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center h-[36px] px-3 rounded-md transition-all duration-100 group gap-2",
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
                      <span className="truncate text-[14px] font-medium">
                        {item.label}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col">
        <div className="px-4 py-4 text-center">
          <p className="text-[12px] font-medium text-[color:var(--text-tertiary)]">
            © 2026 White Cloak Technologies, Inc.
          </p>
        </div>
      </div>
    </aside>
  );
}
