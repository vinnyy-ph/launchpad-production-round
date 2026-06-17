"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, DoorOpen, LayoutGrid, ClipboardCheck,
  Users, Network, ClipboardList, UserCog, UserCircle, BookOpen, ShieldCheck,
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
  badge?: number;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "General",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/", roles: ["ALL"] },
      { label: "Performance", icon: TrendingUp, href: "/performance", roles: ["ALL"] },
      { label: "Offboarding", icon: DoorOpen, href: "/offboarding", roles: ["ALL"] },
    ],
  },
  {
    title: "Me",
    items: [
      { label: "My profile", icon: UserCircle, href: "/employee/profile", roles: ["ALL"] },
      { label: "My onboarding", icon: BookOpen, href: "/employee/onboarding", roles: ["ALL"] },
      { label: "My clearances", icon: ShieldCheck, href: "/employee/clearance", roles: ["ALL"] },
      { label: "Surveys", icon: ClipboardList, href: "/employee/surveys", roles: ["ALL"] },
    ],
  },
  {
    title: "My Team",
    items: [
      { label: "Overview", icon: LayoutGrid, href: "/supervisor/reports", roles: ["SUPERVISOR"] },
      { label: "Evaluations", icon: ClipboardCheck, href: "/supervisor/evaluations", roles: ["SUPERVISOR"] },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "People", icon: Users, href: "/hr/directory", roles: ["HR"] },
      { label: "Structure", icon: Network, href: "/hr/teams", roles: ["HR"] },
      { label: "Surveys", icon: ClipboardList, href: "/hr/surveys", roles: ["HR"] },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Users", icon: UserCog, href: "/admin/users", roles: ["ADMIN"] },
    ],
  },
];

export function Sidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const { appUser } = useAuth();
  const pathname = usePathname() ?? "";

  const canSee = (roles: AllowedRole[]) => {
    if (!appUser) return false;
    if (roles.includes("ALL")) return true;
    if (roles.includes(appUser.role)) return true;
    if (roles.includes("SUPERVISOR") && appUser.isSupervisor) return true;
    return false;
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex h-full w-[240px] flex-shrink-0 flex-col border-r border-[color:var(--border-primary)] transition-transform duration-300 lg:static lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
      style={{ background: "var(--gray-50)" }}
    >
      {/* Workspace switcher */}
      <div className="px-5 mt-[20px] mb-6 border-b border-[color:var(--border-primary)] pb-4">
        <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[color:var(--border-primary)]">
          <div
            className="w-7 h-7 rounded-lg flex-shrink-0"
            style={{ background: "var(--gradient-jia)" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[color:var(--text-primary)] truncate leading-tight">
              SwiftWork ✦
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
                <span className="block px-5 pb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[color:var(--text-quaternary)]">
                  {section.title}
                </span>
              )}
              <div className="flex flex-col px-2 pb-4">
                {visible.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center py-[7px] px-4 rounded-md transition-all duration-100 group gap-[9px]",
                        active
                          ? "bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)]"
                          : "text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          "flex-shrink-0 transition-colors",
                          active ? "text-[color:var(--text-primary)]" : "text-[color:var(--text-quaternary)] group-hover:text-[color:var(--text-primary)]"
                        )}
                      />
                      <span className={cn("truncate text-[14px] flex-1", active ? "font-bold" : "font-medium")}>
                        {item.label}
                      </span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[color:var(--gray-neutral-900)] px-1.5 text-[11px] font-bold text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
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
            © 2026 SwiftWork
          </p>
        </div>
      </div>
    </aside>
  );
}
