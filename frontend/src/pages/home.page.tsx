// frontend/src/pages/home.page.tsx
import { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw, Bell } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { apiFetch } from "@/shared/lib/api-client";
import { useNotifications } from "@/modules/notifications/hooks/use-notifications";
import { useMarkRead } from "@/modules/notifications/hooks/use-mark-read";
import { NotificationItem } from "@/modules/notifications/components/notification-item";

// Shape returned by GET /api/dashboard (role-aware, backend returns only relevant fields)
interface DashboardStats {
  // HR / ADMIN
  pendingOnboarding?: number;
  pendingOffboarding?: number;
  activeEmployees?: number;
  pendingClearances?: number;
  // SUPERVISOR
  pendingEvaluations?: number;
  directReports?: number;
  unreadSurveys?: number;
  completedEvaluations?: number;
  totalEvaluations?: number;
  // EMPLOYEE
  pendingDocuments?: number;
  onboardingProgress?: number;
  clearanceStatus?: string | null;
}

interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "default" | "warn" | "alert";
}

function StatCard({ label, value, variant = "default" }: StatCardProps) {
  const valueColor =
    variant === "alert"
      ? "var(--color-error-600)"
      : variant === "warn"
      ? "var(--color-warning-600)"
      : "var(--text-primary)";

  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <p
        className="text-2xl font-bold"
        style={{ color: valueColor, fontFamily: "var(--font-sans)" }}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">
        {label}
      </p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
      <div className="h-7 w-16 rounded bg-[color:var(--bg-tertiary)]" />
      <div className="mt-2 h-3 w-24 rounded bg-[color:var(--bg-tertiary)]" />
    </div>
  );
}

export default function HomePage() {
  const { appUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const { notifications, loading: notifLoading, error: notifError, reload: reloadNotifs } = useNotifications(5);
  const { markRead } = useMarkRead(() => void reloadNotifs());

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const data = await apiFetch<DashboardStats>("/api/dashboard");
      setStats(data);
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const statCards = buildStatCards(appUser?.role, appUser?.isSupervisor, stats);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-lg font-bold text-[color:var(--text-primary)]">
          {greeting()}, {firstName(appUser?.displayName ?? appUser?.email ?? "")}
        </h1>
        <p className="text-sm text-[color:var(--text-tertiary)]">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          At a glance
        </h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />)}
          </div>
        ) : statsError ? (
          <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
            <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
            <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{statsError}</span>
            <button
              onClick={() => void loadStats()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        )}
      </section>

      {/* Recent notifications */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Recent notifications
        </h2>
        <div
          className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          {notifLoading ? (
            <div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 px-4 py-3 border-b border-[color:var(--border-primary)] last:border-0">
                  <div className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[color:var(--bg-tertiary)]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-[color:var(--bg-tertiary)]" />
                    <div className="h-2.5 w-1/2 rounded bg-[color:var(--bg-tertiary)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifError ? (
            <div className="flex items-center gap-3 p-4">
              <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
              <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{notifError}</span>
              <button
                onClick={() => void reloadNotifs()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Bell size={20} className="text-[color:var(--text-quaternary)]" />
              <p className="text-sm text-[color:var(--text-tertiary)]">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[color:var(--border-primary)]">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={markRead} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string) {
  return name.split(/[\s@]/)[0] ?? name;
}

function buildStatCards(
  role: string | undefined,
  isSupervisor: boolean | undefined,
  stats: DashboardStats | null
): StatCardProps[] {
  if (!stats) return [];

  if (role === "ADMIN" || role === "HR") {
    return [
      {
        label: "Pending onboarding",
        value: stats.pendingOnboarding ?? "—",
        variant: (stats.pendingOnboarding ?? 0) > 0 ? "warn" : "default",
      },
      {
        label: "Pending offboarding",
        value: stats.pendingOffboarding ?? "—",
        variant: (stats.pendingOffboarding ?? 0) > 0 ? "alert" : "default",
      },
      { label: "Active employees", value: stats.activeEmployees ?? "—" },
      {
        label: "Clearance awaiting",
        value: stats.pendingClearances ?? "—",
        variant: (stats.pendingClearances ?? 0) > 0 ? "warn" : "default",
      },
    ];
  }

  if (isSupervisor) {
    return [
      {
        label: "Pending evaluations",
        value: stats.pendingEvaluations ?? "—",
        variant: (stats.pendingEvaluations ?? 0) > 0 ? "warn" : "default",
      },
      { label: "Direct reports", value: stats.directReports ?? "—" },
      {
        label: "Unanswered surveys",
        value: stats.unreadSurveys ?? "—",
        variant: (stats.unreadSurveys ?? 0) > 0 ? "warn" : "default",
      },
      {
        label: "Evals complete",
        value: stats.totalEvaluations
          ? `${stats.completedEvaluations ?? 0}/${stats.totalEvaluations}`
          : "—",
      },
    ];
  }

  // EMPLOYEE
  return [
    {
      label: "Documents pending",
      value: stats.pendingDocuments ?? "—",
      variant: (stats.pendingDocuments ?? 0) > 0 ? "warn" : "default",
    },
    {
      label: "Onboarding progress",
      value: stats.onboardingProgress != null ? `${stats.onboardingProgress}%` : "—",
    },
    {
      label: "Unanswered surveys",
      value: stats.unreadSurveys ?? "—",
      variant: (stats.unreadSurveys ?? 0) > 0 ? "warn" : "default",
    },
    { label: "Clearance status", value: stats.clearanceStatus ?? "—" },
  ];
}
