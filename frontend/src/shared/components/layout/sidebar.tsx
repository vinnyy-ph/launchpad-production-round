"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { visibleSections, WORKSPACE_NAME } from "./nav-config";
import { ManageJiaLogo } from "@/shared/components/brand/manage-jia-logo";
import { cn } from "@/shared/lib/utils";

export function Sidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const { appUser } = useAuth();
  const pathname = usePathname() ?? "";

  // Single source of truth: every section whose role lane this user holds, in fixed order.
  const sections = visibleSections(appUser);

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
      {/* Brand mark (Jia logomark) */}
      <div className="flex justify-center pt-4">
        <ManageJiaLogo markOnly size={32} />
      </div>

      {/* Workspace switcher */}
      <div className="px-5 mt-4 mb-6 border-b border-[color:var(--border-primary)] pb-4">
        <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[color:var(--border-primary)]">
          <div
            className="w-7 h-7 rounded-lg flex-shrink-0"
            style={{ background: "var(--gradient-jia)" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[color:var(--text-primary)] truncate leading-tight">
              {WORKSPACE_NAME}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {sections.map((section) => {
          return (
            <div key={section.title} className="mb-4">
              <span className="block px-5 pb-1 text-xs font-bold uppercase tracking-[0.04em] text-[#A4A7AE]">
                {section.title}
              </span>
              <div className="flex flex-col px-2 pb-4">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 transition-colors duration-100",
                        active
                          ? "bg-[#EFF1F5] text-[#252B37]"
                          : "text-[color:var(--text-secondary)] hover:bg-[#EFF1F5]"
                      )}
                    >
                      <Icon size={18} className="flex-shrink-0 text-[#A4A7AE]" />
                      <span className="flex-1 truncate text-[14px] font-medium">
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
            © 2026 White Cloak Technologies, Inc.
          </p>
        </div>
      </div>
    </aside>
  );
}
