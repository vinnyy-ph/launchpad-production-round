import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchEvaluations } from "../services/evaluations.service";

/** Loads all evaluations visible to the current user. */
export function useEvaluations() {
  return useQuery({
    queryKey: queryKeys.evaluations.list(),
    queryFn: fetchEvaluations,
  });
}
