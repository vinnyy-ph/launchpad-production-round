import { walkDownward } from "../../../shared/org/traversal";

/**
 * Who a pulse targets. Mapped by the service from the survey's `audienceType` +
 * `audienceConfigs` (SurveyAudienceConfig rows carry supervisorId / teamId).
 */
export type AudienceSpec =
  | { type: "EVERYONE" }
  | { type: "SUPERVISOR_BASED"; supervisorIds: string[] }
  | { type: "SPECIFIC_TEAMS"; teamIds: string[] };

/**
 * The DB slice audience resolution needs. Declared structurally so the rule is unit
 * testable with an in-memory fake; the real adapter applies ACTIVE_EMPLOYEE server-side.
 */
export interface AudienceDb {
  /** All employee ids matching ACTIVE_EMPLOYEE. */
  activeEmployeeIds(): Promise<string[]>;
  /** The subset of `ids` matching ACTIVE_EMPLOYEE. */
  activeAmong(ids: string[]): Promise<string[]>;
  /** Direct-report ids for a frontier of supervisor ids (drives the downward walk). */
  childrenOf(parentIds: string[]): Promise<string[]>;
  /** Active employee ids who belong to any of `teamIds`. */
  activeTeamMemberIds(teamIds: string[]): Promise<string[]>;
}

/**
 * Resolve a survey's audience to a de-duplicated list of ACTIVE employee ids.
 * Re-run at each occurrence release (new hires in, inactive/deactivated out).
 * SUPERVISOR_BASED = each anchor's full downward subtree (direct reports and everyone
 * below them), EXCLUDING the explicitly selected anchor(s) themselves — per the brief,
 * "Selected supervisor(s)' direct reports (and everyone below them)".
 */
export async function resolveAudience(spec: AudienceSpec, db: AudienceDb): Promise<string[]> {
  if (spec.type === "EVERYONE") {
    return db.activeEmployeeIds();
  }
  if (spec.type === "SUPERVISOR_BASED") {
    const ids = new Set<string>();
    for (const supervisorId of spec.supervisorIds) {
      // walkDownward returns descendants only (never the anchor itself).
      for (const reportId of await walkDownward(supervisorId, db.childrenOf)) ids.add(reportId);
    }
    // Exclude every explicitly selected anchor — even one that sits below another selected
    // anchor (so a selected sub-manager is treated as an anchor, not a recipient).
    for (const supervisorId of spec.supervisorIds) ids.delete(supervisorId);
    return db.activeAmong([...ids]);
  }
  return db.activeTeamMemberIds(spec.teamIds);
}
