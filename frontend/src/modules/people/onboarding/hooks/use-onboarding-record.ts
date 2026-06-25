import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getEmployeeProfile } from "@/modules/people/employees/services/employees.service";
import {
  getCustomFieldConfigs,
  getDocumentConfigs,
  getDocumentReviews,
  getOnboardingStatusForEmployee,
} from "../services/onboarding.service";

/**
 * HR detail for one onboarding employee. Combines:
 *  - the employee profile (identity / pre-filled data),
 *  - the org-wide required documents + custom fields config,
 *  - that employee's document submissions (filtered from the review feed), and
 *  - the HR-scoped onboarding status, which carries the employee's ACTUAL
 *    custom-field answers and per-document submission statuses.
 */
export function useOnboardingRecord(employeeId: string | null) {
  const profileQuery = useQuery({
    queryKey: employeeId
      ? queryKeys.employees.detail(employeeId)
      : queryKeys.employees.detail(""),
    queryFn: () => getEmployeeProfile(employeeId!),
    enabled: Boolean(employeeId),
  });

  const docConfigQuery = useQuery({
    queryKey: queryKeys.onboarding.documentConfigs,
    queryFn: () => getDocumentConfigs(),
  });

  const fieldConfigQuery = useQuery({
    queryKey: queryKeys.onboarding.customFieldConfigs,
    queryFn: () => getCustomFieldConfigs(),
  });

  const reviewsQuery = useQuery({
    queryKey: queryKeys.onboarding.reviews(),
    queryFn: () => getDocumentReviews(),
  });

  const statusQuery = useQuery({
    queryKey: employeeId
      ? queryKeys.onboarding.status(employeeId)
      : queryKeys.onboarding.status(""),
    queryFn: () => getOnboardingStatusForEmployee(employeeId!),
    enabled: Boolean(employeeId),
  });

  return {
    employee: profileQuery.data?.data ?? null,
    documentConfigs: docConfigQuery.data ?? [],
    customFieldConfigs: fieldConfigQuery.data ?? [],
    reviews: reviewsQuery.data ?? [],
    status: statusQuery.data ?? null,
    loading: profileQuery.isLoading,
    error: profileQuery.error instanceof Error ? profileQuery.error.message : null,
    reload: () => {
      void profileQuery.refetch();
      void docConfigQuery.refetch();
      void fieldConfigQuery.refetch();
      void reviewsQuery.refetch();
      void statusQuery.refetch();
    },
  };
}
