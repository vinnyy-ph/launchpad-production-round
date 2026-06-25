"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useDashboard } from "@/modules/dashboard/hooks/use-dashboard";
import { useMySurveys } from "@/modules/performance/surveys/hooks/use-my-surveys";
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

  // Live count on the employee Performance item: pulses still to answer + evaluations still to
  // acknowledge. The survey count comes from the same to-answer list the Performance page shows
  // (useMySurveys), NOT the dashboard's broader "open surveys" stat, so the badge matches the
  // page's "Surveys" tab exactly. pendingAcknowledgements already matches the "Evaluations" tab.
  const { stats } = useDashboard();
  const { data: mySurveys } = useMySurveys();
  const performanceBadge = (mySurveys?.length ?? 0) + (stats?.pendingAcknowledgements ?? 0);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex h-full w-[240px] flex-shrink-0 flex-col overflow-y-auto border-r transition-transform duration-300 lg:static lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
      style={{
        background: "rgb(249,249,251)",
        borderColor: "rgb(233,234,235)",
        boxShadow: "0px 1px 2px 0px rgba(10,13,18,0.05)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Logo */}
      <div className="flex justify-center pt-4">
        <ManageJiaLogo markOnly size={32} />
      </div>

      {/* Workspace card */}
      <div
        className="mx-5 mb-6 mt-4 flex items-center gap-2 rounded-xl bg-white p-3"
        style={{ boxShadow: "inset 0 0 0 1px rgb(233,234,235)" }}
      >
        <div
          className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg"
          style={{ background: "var(--gradient-jia)" }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium leading-5 text-[#181D27]">
            {WORKSPACE_NAME}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col">
            <span className="px-5 pb-1 text-[12px] font-bold uppercase leading-[18px] tracking-[0.04em] text-[color:var(--gray-neutral-400)]">
              {section.title}
            </span>
            <div className="flex flex-col px-2 pb-4">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const badge = item.id === "performance" ? performanceBadge : item.badge;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-md px-3 text-[14px] font-medium leading-5 transition-colors duration-100",
                      active
                        ? "bg-[color:var(--gray-100)] text-[color:var(--gray-neutral-800)]"
                        : "text-[color:var(--gray-neutral-700)] hover:bg-[color:var(--gray-100)]"
                    )}
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                      <Icon
                        size={20}
                        strokeWidth={1.75}
                        className="text-[color:var(--gray-neutral-400)]"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge != null && badge > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-[22px] items-center justify-center rounded-md border border-[color:var(--gray-neutral-300)] bg-white px-1.5 text-[11px] font-medium leading-none text-[color:var(--gray-neutral-700)]">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-4 pb-4 text-center">
        <p className="text-[12px] font-medium leading-[18px] text-[color:var(--gray-neutral-500)]">
          © 2026
          <br />
          White Cloak Technologies, Inc.
        </p>
      </div>
    </aside>
  );
}
