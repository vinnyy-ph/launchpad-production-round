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
      return ctx.caller.teamIds.some((id) => survey.audienceConfigTeamIds.includes(id));
    case "SPECIFIC_TEAMS":
      return ctx.caller.teamIds.some((id) => survey.visibilityConfigTeamIds.includes(id));
    case "HR_ROOT_ONLY":
      return ctx.caller.supervisorId === null;
    default:
      return false;
  }
}
