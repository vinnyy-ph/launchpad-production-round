"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, RotateCcw } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { setView } from "@/modules/auth/stores/auth.store";
import { roleHome } from "@/modules/auth/role-home";
import { DEMO_VIEWS, DEMO_PROFILES, type DemoView } from "@/shared/mock/identity";
import { resetDemo } from "@/shared/mock/db";

const LABELS: Record<DemoView, string> = {
  ADMIN: "Admin", HR: "HR", SUPERVISOR: "Supervisor", EMPLOYEE: "Employee",
};

function currentView(role?: string, isSupervisor?: boolean): DemoView {
  if (role === "ADMIN") return "ADMIN";
  if (role === "HR") return "HR";
  if (isSupervisor) return "SUPERVISOR";
  return "EMPLOYEE";
}

export function RoleSwitcher() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!appUser) return null;
  const active = currentView(appUser.role, appUser.isSupervisor);

  const pick = (view: DemoView) => {
    setOpen(false);
    setView(view);
    router.push(roleHome(DEMO_PROFILES[view]));
  };

  const onReset = () => {
    setOpen(false);
    resetDemo();
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-[color:var(--border-secondary)] bg-white text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Demo: switch role view"
      >
        <Eye size={15} aria-hidden="true" />
        <span className="hidden sm:inline">Viewing as</span>
        <span className="font-semibold text-[color:var(--text-primary)]">{LABELS[active]}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <p className="px-3 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[color:var(--text-quaternary)]">
            Demo role
          </p>
          {DEMO_VIEWS.map((view) => (
            <button
              key={view}
              role="menuitemradio"
              aria-checked={view === active}
              onClick={() => pick(view)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
            >
              <span>{LABELS[view]}</span>
              {view === active && <span className="text-[color:var(--text-primary)]">●</span>}
            </button>
          ))}
          <div className="border-t border-[color:var(--border-primary)]">
            <button
              role="menuitem"
              onClick={onReset}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
            >
              <RotateCcw size={14} />
              Reset demo data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
