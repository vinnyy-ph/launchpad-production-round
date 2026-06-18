import { apiFetch } from "@/shared/lib/api-client";
import type { Team, TeamFilters, TeamListMeta } from "../types/teams.types";

interface TeamListResponse {
  data: Team[];
  meta: TeamListMeta;
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
