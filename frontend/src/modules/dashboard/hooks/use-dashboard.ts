import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { readCollection } from "@/shared/mock/db";

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
  clearanceStatus?: string | null;
}

// Demo stats: `activeEmployees` is derived from the mock employee collection;
// the rest are representative figures (no backend).
function mockDashboardStats(): DashboardStats {
  const employees = readCollection<{ isActive?: boolean }>("employees");
  return {
    pendingOnboarding: 2,
    pendingOffboarding: 1,
    activeEmployees: employees.filter((e) => e.isActive !== false).length,
    pendingClearances: 1,
    pendingEvaluations: 2,
    directReports: 4,
    unreadSurveys: 1,
    completedEvaluations: 3,
    totalEvaluations: 5,
    pendingDocuments: 1,
    onboardingProgress: 80,
    clearanceStatus: "In progress",
  };
}

export function useDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => Promise.resolve(mockDashboardStats()),
  });

  return {
    stats: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
