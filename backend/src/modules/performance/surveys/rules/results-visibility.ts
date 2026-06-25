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
 *
 * Access = `isHrOrRoot(viewer) || satisfiesVisibilityScope(viewer, survey)`. HR and the org
 * root node are the FLOOR of the viewer set: they may open the results in every visibility
 * scope, never removed by it ("HR + Root Only" is just the case where no extra viewers are
 * added). Visibility scopes only ADD viewers on top of that floor. This gates ACCESS only —
 * the results service still scopes a root's *data* to their own chain (a root sitting outside
 * a Team-based survey's teams gets in, but sees their slice), and anonymity/min-group-size
 * suppression is applied separately downstream.
 *
 * The SUPERVISOR_BASED case depends on whether any of the caller's downward chain is in the
 * audience — that async lookup is resolved by the caller and passed in as
 * `supervisorAudienceOverlap`, keeping this function pure and synchronous.
 */
export function canViewSurveyResults(
  ctx: ResultsViewerContext,
  survey: SurveyVisibilityInfo,
  supervisorAudienceOverlap: boolean,
): boolean {
  if (ctx.isHR) return true;
  if (!ctx.caller) return false;
  // Root node (the single employee with no supervisor) is part of the access floor alongside
  // HR, independent of the visibility scope. This subsumes the HR_ROOT_ONLY root case below.
  if (ctx.caller.supervisorId === null) return true;

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
