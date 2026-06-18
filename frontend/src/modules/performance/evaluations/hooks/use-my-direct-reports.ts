import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchReviewees } from "../services/evaluations.service";

/** The current supervisor's active direct reports — the selectable reviewees. */
export function useMyDirectReports() {
  return useQuery({
    queryKey: queryKeys.evaluations.reviewees,
    queryFn: fetchReviewees,
  });
}
