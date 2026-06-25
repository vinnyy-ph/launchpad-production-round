import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { previewAudience } from "../services/surveys.service";
import type { PreviewAudienceInput } from "../types/surveys.types";

/**
 * Live "who will receive this" preview. The caller passes a (debounced) input;
 * the query re-runs whenever the input changes and keeps the previous count
 * visible while the next preview is in flight.
 */
export function usePreviewAudience(input: PreviewAudienceInput, enabled = true) {
  return useQuery({
    queryKey: ["surveys", "audience-preview", input],
    queryFn: () => previewAudience(input),
    enabled,
    placeholderData: keepPreviousData,
  });
}
