jest.mock("@/shared/lib/api-client", () => ({
  apiFetch: jest.fn(() =>
    Promise.resolve({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
  ),
}));

import { apiFetch } from "@/shared/lib/api-client";
import { getTeams } from "@/modules/people/teams/services/teams.service";

describe("getTeams", () => {
  afterEach(() => jest.clearAllMocks());

  it("calls the teams endpoint with default pagination for filter dropdowns", async () => {
    await getTeams();
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/teams?page=1&limit=100");
  });

  it("supports custom pagination", async () => {
    await getTeams({ page: 2, limit: 25 });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/teams?page=2&limit=25");
  });
});
