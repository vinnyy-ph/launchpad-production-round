import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  getInvitationStatus,
  resendInvitation,
  sendInvitation,
  updateInvitationEmail,
} from "../services/onboarding.service";
import type { UpdateInvitationEmailInput } from "../types/onboarding.types";

/** Lists invitations for an onboarding record. */
export function useInvitationStatus(recordId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: recordId
      ? queryKeys.onboarding.invitations(recordId)
      : queryKeys.onboarding.invitations(""),
    queryFn: () => getInvitationStatus(recordId!),
    enabled: Boolean(recordId),
  });

  return {
    invitations: data ?? [],
    latestInvitation: data?.[0] ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}

/** HR (re)sends the onboarding invitation for a record. */
export function useSendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => sendInvitation(recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all }),
  });
}

/** HR resends an invitation by invitation id. */
export function useResendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => resendInvitation(invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all }),
  });
}

/** HR corrects the invitation email before the employee signs in. */
export function useUpdateInvitationEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { invitationId: string; input: UpdateInvitationEmailInput }) =>
      updateInvitationEmail(vars.invitationId, vars.input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all }),
  });
}
