import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/shared/lib/query-keys";
import type { Survey } from "@/shared/mock/types";
import {
  activateSurvey,
  createSurvey,
  deactivateSurvey,
  deleteSurvey,
  getSurveys,
  updateSurvey,
} from "../services/surveys.service";

export function useSurveys() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all });

  const { data = [], isLoading, error } = useQuery({
    queryKey: queryKeys.surveys.list(),
    queryFn: getSurveys,
  });

  const saveMutation = useMutation({
    mutationFn: (survey: Survey) => {
      const isExisting = data.some((s) => s.id === survey.id);
      return isExisting ? updateSurvey(survey.id, survey) : createSurvey(survey);
    },
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save survey."),
  });

  const removeMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete survey."),
  });

  const activateMutation = useMutation({
    mutationFn: activateSurvey,
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to activate survey."),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateSurvey,
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to deactivate survey."),
  });

  return {
    surveys: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: () => queryClient.invalidateQueries({ queryKey: queryKeys.surveys.list() }),
    save: saveMutation.mutate,
    remove: removeMutation.mutate,
    activate: activateMutation.mutate,
    deactivate: deactivateMutation.mutate,
  };
}
