import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { apiFetch } from "@/shared/lib/api-client";

// Role-aware dashboard stats. The home screen picks the fields relevant to the
// active role, so a single object covering every field is returned.
export interface DashboardStats {
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
  pendingAcknowledgements?: number;
  clearanceStatus?: string | null;
  /** The caller's org-graph supervisor (reportsTo). Null when they are the root node. */
  supervisor?: {
    id: string;
    fullName: string;
    jobTitle: string | null;
    avatarUrl: string | null;
  } | null;
}

// GET /api/dashboard (not versioned) returns role-gated counts: a subset of the
// fields above based on the caller's role. Absent fields render as "—" in the UI.
function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/api/dashboard");
}

export function useDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: fetchDashboardStats,
  });

  return {
    stats: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
