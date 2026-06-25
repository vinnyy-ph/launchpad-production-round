import { apiFetch } from "@/shared/lib/api-client";
import type {
  CreateTeamInput,
  Team,
  TeamFilters,
  TeamListMeta,
} from "../types/teams.types";

interface TeamListResponse {
  data: Team[];
  meta: TeamListMeta;
}

interface TeamResponse {
  data: Team;
}

const BASE = "/api/v1/teams";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100;

export async function getTeams(filters: TeamFilters = {}): Promise<TeamListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? DEFAULT_PAGE));
  params.set("limit", String(filters.limit ?? DEFAULT_LIMIT));

  return apiFetch<TeamListResponse>(`${BASE}?${params.toString()}`);
}

/** Creates a team with a leader and members (HR/Admin only). */
export async function createTeam(input: CreateTeamInput): Promise<TeamResponse> {
  return apiFetch<TeamResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Renames a team (HR/Admin only). */
export async function updateTeamName(teamId: string, name: string): Promise<TeamResponse> {
  return apiFetch<TeamResponse>(`${BASE}/${teamId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

/** Adds members to a team without removing existing ones (HR/Admin or the team's leader). */
export async function addTeamMembers(teamId: string, memberIds: string[]): Promise<TeamResponse> {
  return apiFetch<TeamResponse>(`${BASE}/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ memberIds }),
  });
}

/** Removes one member from a team (HR/Admin or the team's leader). The leader cannot be removed. */
export async function removeTeamMember(teamId: string, employeeId: string): Promise<TeamResponse> {
  return apiFetch<TeamResponse>(`${BASE}/${teamId}/members/${employeeId}`, {
    method: "DELETE",
  });
}
