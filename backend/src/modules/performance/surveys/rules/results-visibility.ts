/** Who is asking to view a survey's results. */
export interface ResultsViewerContext {
  isHR: boolean;
  /** null when the caller has no Employee record (non-HR only). */
  caller: { supervisorId: string | null; teamIds: string[] } | null;
}

/** The survey's visibility configuration, pre-flattened to plain id lists. */
export interface SurveyVisibilityInfo {
  visibility: string;
  audienceConfigTeamIds: string[];
  visibilityConfigTeamIds: string[];
}

/**
 * Pure access gate for a survey's results. Mirrors the rule matrix in the spec.
 * The SUPERVISOR_BASED case depends on whether any of the caller's downward chain
 * is in the audience — that async lookup is resolved by the caller and passed in as
 * `supervisorAudienceOverlap`, keeping this function pure and synchronous.
 */
export function canViewSurveyResults(
  ctx: ResultsViewerContext,
  survey: SurveyVisibilityInfo,
  supervisorAudienceOverlap: boolean,
): boolean {
  if (ctx.isHR) return true;
  if (!ctx.caller) return false;

  switch (survey.visibility) {
    case "EVERYONE":
      return true;
    case "SUPERVISOR_BASED":
      return supervisorAudienceOverlap;
    case "TEAM_BASED":
      // Spec: "Everyone in the team can see survey results of the teams they belong to."
      // Visibility is decoupled from the audience — any team member may view; the results
      // service then scopes the response to the caller's own teams. (Keying off the
      // audience teams instead would wrongly deny everyone on an EVERYONE/supervisor-based
      // audience, where there are no audience teams to match.)
      return ctx.caller.teamIds.length > 0;
    case "SPECIFIC_TEAMS":
      return ctx.caller.teamIds.some((id) => survey.visibilityConfigTeamIds.includes(id));
    case "HR_ROOT_ONLY":
      return ctx.caller.supervisorId === null;
    default:
      return false;
  }
}
