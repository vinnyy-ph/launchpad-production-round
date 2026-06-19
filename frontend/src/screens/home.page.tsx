// frontend/src/screens/home.page.tsx
import {
  AlertCircle,
  RefreshCw,
  Bell,
  UserPlus,
  UserMinus,
  Users,
  ShieldCheck,
  ClipboardCheck,
  MessageSquare,
  CheckCircle2,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useDashboard, type DashboardStats } from "@/modules/dashboard/hooks/use-dashboard";
import { useNotifications } from "@/modules/notifications/hooks/use-notifications";
import { useMarkRead } from "@/modules/notifications/hooks/use-mark-read";
import { NotificationItem } from "@/modules/notifications/components/notification-item";
import { KpiCard, type KpiCardProps } from "@/shared/ui/patterns";
import { ScreenHeader } from "@/shared/components/layout/screen-header";

export default function HomePage() {
  const { appUser } = useAuth();
  const { stats, loading: statsLoading, error: statsError, reload: loadStats } = useDashboard();

  const { notifications, loading: notifLoading, error: notifError, reload: reloadNotifs } = useNotifications(5);
  const { markRead } = useMarkRead(() => void reloadNotifs());

  const cards = buildCards(appUser?.role, appUser?.isSupervisor, stats);

  return (
    <div className="min-w-0 space-y-6">
      <ScreenHeader id="dashboard" level="page" />

      {/* KPI cards — hidden for now. Restore by flipping `false` to `true` on the line below. */}
      {false && (
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          At a glance
        </h2>
        {statsError ? (
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {cards.map((card) => (
              <KpiCard key={card.label} {...card} loading={statsLoading} />
            ))}
          </div>
        )}
      </section>
      )}

      {/* Recent notifications */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
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

const PERIOD = "Right now";

function buildCards(
  role: string | undefined,
  isSupervisor: boolean | undefined,
  stats: DashboardStats | null,
): KpiCardProps[] {
  // While stats are loading the value is ignored (the card shows a skeleton);
  // once loaded, an absent metric falls back to "—".
  const num = (n: number | undefined): string | number => (stats ? (n ?? "—") : 0);

  if (role === "ADMIN" || role === "HR") {
    return [
      { icon: UserPlus, label: "Pending onboarding", period: PERIOD, value: num(stats?.pendingOnboarding) },
      { icon: UserMinus, label: "Pending offboarding", period: PERIOD, value: num(stats?.pendingOffboarding) },
      { icon: Users, label: "Active employees", period: PERIOD, value: num(stats?.activeEmployees) },
      { icon: ShieldCheck, label: "Clearance awaiting", period: PERIOD, value: num(stats?.pendingClearances) },
    ];
  }

  if (isSupervisor) {
    return [
      { icon: ClipboardCheck, label: "Pending evaluations", period: PERIOD, value: num(stats?.pendingEvaluations) },
      { icon: Users, label: "Direct reports", period: PERIOD, value: num(stats?.directReports) },
      { icon: MessageSquare, label: "Unanswered surveys", period: PERIOD, value: num(stats?.unreadSurveys) },
      {
        icon: CheckCircle2,
        label: "Evals complete",
        period: PERIOD,
        value: stats
          ? stats.totalEvaluations
            ? `${stats.completedEvaluations ?? 0}/${stats.totalEvaluations}`
            : "—"
          : 0,
      },
    ];
  }

  // EMPLOYEE
  return [
    { icon: FileText, label: "Documents pending", period: PERIOD, value: num(stats?.pendingDocuments) },
    {
      icon: TrendingUp,
      label: "Onboarding progress",
      period: PERIOD,
      value: stats ? (stats.onboardingProgress != null ? `${stats.onboardingProgress}%` : "—") : 0,
    },
    { icon: MessageSquare, label: "Unanswered surveys", period: PERIOD, value: num(stats?.unreadSurveys) },
    {
      icon: ShieldCheck,
      label: "Clearance status",
      period: PERIOD,
      value: stats ? (stats.clearanceStatus ?? "—") : 0,
    },
  ];
}
