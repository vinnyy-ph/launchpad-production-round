import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";

// Shape returned by GET /api/dashboard (role-aware; backend returns only the relevant fields).
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
  clearanceStatus?: string | null;
}

export function useDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => apiFetch<DashboardStats>("/api/dashboard"),
  });

  return {
    stats: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
