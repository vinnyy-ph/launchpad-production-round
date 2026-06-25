import { useQueries } from "@tanstack/react-query";
import { ApiError } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { buildPulseCard, type PulseCardModel } from "@/screens/supervisor/pulse-results.logic";
import { fetchSurveyResults } from "../services/surveys.service";
import type { SurveyResults } from "../types/surveys.types";
import { useVisibleResultSurveys } from "./use-visible-result-surveys";

export interface EnrichedPulseResults {
  cards: PulseCardModel[];
  /** Discovery list (which surveys the user may view) is loading. */
  isLoading: boolean;
  /** Discovery list failed. */
  isError: boolean;
  refetch: () => void;
  /** Any per-survey results fetch is still in flight. */
  detailsLoading: boolean;
}

/** A small anonymous team's results are forbidden to its own supervisor — a stable hidden state. */
function isSmallTeamBlock(err: unknown): boolean {
  return err instanceof ApiError && err.errorCode === "RESULTS_FORBIDDEN_SMALL_TEAM_SUPERVISOR";
}

/**
 * The surveys the signed-in user may view, each enriched with participation + sentiment fetched
 * per survey. Anonymity stays server-driven: a 403 small-team block becomes `forbidden`, and a
 * `suppressed` payload yields participation only (no sentiment).
 */
export function useEnrichedPulseResults(): EnrichedPulseResults {
  const list = useVisibleResultSurveys();
  const surveys = list.data ?? [];

  const resultQueries = useQueries({
    queries: surveys.map((s) => ({
      queryKey: queryKeys.surveys.results(s.id),
      queryFn: () => fetchSurveyResults(s.id),
      // Don't retry the small-team 403 — it's a stable hidden state, not a transient failure.
      retry: (count: number, err: unknown) => !isSmallTeamBlock(err) && count < 2,
    })),
  });

  const cards = surveys.map((s, i) => {
    const q = resultQueries[i];
    const results = (q?.data as SurveyResults | undefined) ?? null;
    return buildPulseCard(s, results, isSmallTeamBlock(q?.error));
  });

  return {
    cards,
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: () => void list.refetch(),
    detailsLoading: resultQueries.some((q) => q.isLoading),
  };
}
