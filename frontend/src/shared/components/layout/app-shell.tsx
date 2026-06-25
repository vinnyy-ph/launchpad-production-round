"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { PendingAckBanner } from "./pending-ack-banner";
import { UnansweredSurveyBanner } from "./unanswered-survey-banner";
import { ClearanceSignatureBanner } from "./clearance-signature-banner";
import { BreadcrumbProvider } from "./breadcrumb-context";
import { PageTransition } from "./page-transition";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <BreadcrumbProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
        <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
        {mobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-[rgba(14,16,27,0.48)] lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onMenuClick={() => setMobileOpen((p) => !p)} />
          <PendingAckBanner />
          <UnansweredSurveyBanner />
          <ClearanceSignatureBanner />
          <main className="flex-1 overflow-y-auto bg-[color:var(--bg-primary)] px-6 pt-6 pb-10">
            <PageTransition className="h-full">{children}</PageTransition>
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
