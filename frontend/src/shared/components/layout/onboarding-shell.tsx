"use client";

import type { ReactNode } from "react";
import { ManageJiaLogo } from "@/shared/components/brand/manage-jia-logo";
import { useAuth } from "@/modules/auth/hooks/use-auth";

/**
 * Focused chrome for the onboarding wizard. A still-onboarding hire has no other
 * screens yet, so we deliberately drop the app sidebar — the wizard is the whole
 * first session. Just a brand bar over a centered canvas.
 */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function OnboardingShell({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const initials = appUser?.displayName ? initialsOf(appUser.displayName) : "";

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[color:var(--border-primary)] bg-white px-4 lg:px-6">
        <div className="flex items-center gap-2.5">
          <ManageJiaLogo size={30} />
          <span className="hidden rounded-full bg-[color:var(--bg-secondary)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--text-tertiary)] sm:inline">
            Getting started
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {initials && (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{
                background: "var(--gradient-jia)",
                boxShadow: "inset 0 0 2px 0 rgba(0,16,53,.16)",
              }}
              aria-hidden="true"
            >
              {initials}
            </span>
          )}
          {appUser?.displayName && (
            <span className="hidden text-[13px] font-medium text-[color:var(--text-primary)] sm:inline">
              {appUser.displayName}
            </span>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-4 py-8 lg:px-6">{children}</div>
      </main>
    </div>
  );
}
