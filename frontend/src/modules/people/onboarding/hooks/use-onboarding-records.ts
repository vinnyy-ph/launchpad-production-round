import { useQueries, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getEmployees } from "@/modules/people/employees/services/employees.service";
import type { EmployeeFilters } from "@/modules/people/employees/types/employees.types";
import type {
  EmployeeOnboardingStatus,
  OnboardingInvitationStatus,
} from "../types/onboarding.types";
import {
  getDocumentReviews,
  getOnboardingStatusForEmployee,
} from "../services/onboarding.service";

/**
 * HR list of onboarding cases. Onboarding employees come from the employee
 * directory filtered to `status=onboarding`; per-employee document submissions
 * (used to derive coarse progress) come from the document-reviews feed.
 * Invitation status comes from each employee's HR-scoped onboarding status.
 */
export function useOnboardingRecords(filters: EmployeeFilters = {}) {
  const employeesQuery = useQuery({
    queryKey: queryKeys.onboarding.records(filters as Record<string, unknown>),
    queryFn: () => getEmployees({ ...filters, status: "onboarding", limit: 100 }),
  });

  const reviewsQuery = useQuery({
    queryKey: queryKeys.onboarding.reviews(),
    queryFn: () => getDocumentReviews(),
  });

  const employeeIds = employeesQuery.data?.data.map((e) => e.id) ?? [];

  const statusQueries = useQueries({
    queries: employeeIds.map((employeeId) => ({
      queryKey: queryKeys.onboarding.status(employeeId),
      queryFn: () => getOnboardingStatusForEmployee(employeeId),
      enabled: Boolean(employeeId),
    })),
  });

  const invitationStatusByEmployeeId = new Map<string, OnboardingInvitationStatus | null>();
  const statusByEmployeeId = new Map<string, EmployeeOnboardingStatus>();
  employeeIds.forEach((employeeId, index) => {
    const status = statusQueries[index]?.data;
    invitationStatusByEmployeeId.set(
      employeeId,
      status?.invitationStatus ?? null,
    );
    if (status) {
      statusByEmployeeId.set(employeeId, status);
    }
  });

  const statusesLoading =
    employeeIds.length > 0 && statusQueries.some((query) => query.isLoading);

  return {
    employees: employeesQuery.data?.data ?? [],
    reviews: reviewsQuery.data ?? [],
    invitationStatusByEmployeeId,
    statusByEmployeeId,
    loading: employeesQuery.isLoading || statusesLoading,
    error: employeesQuery.error instanceof Error ? employeesQuery.error.message : null,
    reload: () => {
      void employeesQuery.refetch();
      void reviewsQuery.refetch();
      statusQueries.forEach((query) => {
        void query.refetch();
      });
    },
  };
}
