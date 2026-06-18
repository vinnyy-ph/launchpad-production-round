import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getEmployees } from "@/modules/people/employees/services/employees.service";
import type { EmployeeFilters } from "@/modules/people/employees/types/employees.types";
import { getDocumentReviews } from "../services/onboarding.service";

/**
 * HR list of onboarding cases. Onboarding employees come from the employee
 * directory filtered to `status=onboarding`; per-employee document submissions
 * (used to derive coarse progress) come from the document-reviews feed.
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

  return {
    employees: employeesQuery.data?.data ?? [],
    reviews: reviewsQuery.data ?? [],
    loading: employeesQuery.isLoading,
    error: employeesQuery.error instanceof Error ? employeesQuery.error.message : null,
    reload: () => {
      void employeesQuery.refetch();
      void reviewsQuery.refetch();
    },
  };
}
