"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, ArrowUpRight, ShieldCheck, Users, Activity, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useDashboard } from "@/modules/dashboard/hooks/use-dashboard";
import { useAssignedClearances } from "@/modules/people/offboarding";
import { Button } from "@/shared/ui";
import {
  getFirstName,
  computeGreeting,
  buildAttentionZones,
  buildPriority,
  buildOrgHealth,
  rowAriaLabel,
  type AttentionRow,
} from "./home.logic";

/** Per-metric icon for the org-health cards; unmapped ids fall back to a neutral pulse icon. */
const ORG_HEALTH_ICONS: Record<string, LucideIcon> = {
  "active-employees": Users,
  clearances: ShieldCheck,
};

/** Calm entrance — whileInView fade + slight slide-up; reduced-motion honoured globally via MotionConfig. */
const reveal = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.3, ease: [0.2, 0, 0, 1] as const },
};

export default function HomePage() {
  const { appUser } = useAuth();
  const { stats, loading: statsLoading, error: statsError, reload: loadStats } = useDashboard();

  const { clearances: assignedClearances } = useAssignedClearances(Boolean(appUser?.employeeId));
  const pendingSignatures = assignedClearances.filter((c) => c.status === "PENDING").length;

  const firstName = getFirstName(appUser);

  // Greeting resolves from the local clock after mount (server HTML + first paint show the neutral
  // fallback, then it settles to the time band) to keep hydration in agreement.
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => setGreeting(computeGreeting(new Date(), firstName)), [firstName]);

  const zones = buildAttentionZones({
    role: appUser?.role,
    isSupervisor: appUser?.isSupervisor,
    employeeStatus: appUser?.employeeStatus,
    stats,
    pendingSignatures,
  });
  const priority = buildPriority(zones);
  const orgHealth = buildOrgHealth(appUser?.role, stats);

  return (
    <div className="min-w-0 space-y-7">
      {/* Greeting — one slim line, not a card. (h1) */}
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
        {greeting ?? `Welcome${firstName ? `, ${firstName}` : ""}`}
      </h1>

      {statsError ? (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{statsError}</span>
          <Button variant="ghost" size="sm" onClick={() => void loadStats()}>
            <RefreshCw /> Retry
          </Button>
        </div>
      ) : statsLoading ? (
        <div
          className="h-[72px] rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        />
      ) : (
        <>
          {/* Priority band — the single most prominent block; compact, not a hero. */}
          <motion.div
            {...reveal}
            className="rounded-xl border border-[color:var(--border-primary)] bg-white px-5 py-4"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            {priority.count > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-semibold text-[color:var(--text-primary)]">
                  You have {priority.count} thing{priority.count === 1 ? "" : "s"} to review today.
                </p>
                {priority.primary && (
                  <Link
                    href={priority.primary.href}
                    aria-label={rowAriaLabel(priority.primary)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[color:hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                  >
                    {priority.primary.action}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-base font-semibold text-[color:var(--text-primary)]">
                You&apos;re all caught up.
              </p>
            )}
          </motion.div>

          {/* Needs your attention — grouped by scope, promoted to the top. (h2 + zone h3s) */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Needs your attention
            </h2>

            <Zone title="For you" rows={zones.forYou} emptyText="Nothing for you right now." />
            {zones.yourTeam !== null && (
              <Zone title="Your team" rows={zones.yourTeam} emptyText="Your team is all set." />
            )}
            {zones.organization !== null && (
              <Zone
                title="The organization"
                rows={zones.organization}
                emptyText="Nothing needs the organization right now."
              />
            )}
          </section>

          {/* Org health — HR only; trending / linking cards (no static headcounts). */}
          {orgHealth.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Org health
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {orgHealth.map((card) => {
                  const Icon = ORG_HEALTH_ICONS[card.id] ?? Activity;
                  return (
                    <motion.div {...reveal} key={card.id}>
                      <Link
                        href={card.href}
                        className="group flex h-full flex-col rounded-xl border border-[color:var(--border-primary)] bg-white p-5 transition-colors hover:border-[color:var(--border-secondary)]"
                        style={{ boxShadow: "var(--shadow-xs)" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)]">
                            <Icon size={16} aria-hidden="true" />
                          </span>
                          <p className="text-sm font-semibold text-[color:var(--text-secondary)]">
                            {card.label}
                          </p>
                        </div>
                        <p className="mt-4 text-[34px] font-bold leading-none tracking-[-0.02em] text-[color:var(--text-primary)]">
                          {card.count}
                        </p>
                        <p className="mt-1.5 text-sm text-[color:var(--text-tertiary)]">{card.unit}</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--text-secondary)]">
                          {card.action}
                          <ArrowUpRight
                            size={13}
                            className="text-[color:var(--text-quaternary)] transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** One scope zone: a labelled card whose rows tie each label to its action (no edge-to-edge float). */
function Zone({ title, rows, emptyText }: { title: string; rows: AttentionRow[]; emptyText: string }) {
  return (
    <motion.div
      {...reveal}
      className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <h3 className="border-b border-[color:var(--border-secondary)] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
        {title}
      </h3>
      {rows.length > 0 ? (
        <div className="divide-y divide-[color:var(--border-secondary)]">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              aria-label={rowAriaLabel(row)}
              className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[color:var(--bg-secondary)]"
            >
              <span className="flex-1 text-sm text-[color:var(--text-primary)]">{row.label}</span>
              <span className="flex-shrink-0 text-xs font-semibold text-[color:var(--text-tertiary)] transition-colors group-hover:text-[color:var(--text-secondary)]">
                {row.action}
              </span>
              <ArrowUpRight
                size={15}
                className="flex-shrink-0 text-[color:var(--text-quaternary)] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-5 py-4 text-sm text-[color:var(--text-tertiary)]">{emptyText}</p>
      )}
    </motion.div>
  );
}
