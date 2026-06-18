jest.mock("@/shared/lib/api-client", () => ({
  apiFetch: jest.fn(() =>
    Promise.resolve({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
  ),
}));

import { apiFetch } from "@/shared/lib/api-client";
import { getEmployees } from "@/modules/people/employees/services/employees.service";

describe("getEmployees", () => {
  afterEach(() => jest.clearAllMocks());

  it("calls the endpoint with default pagination when no filters are given", async () => {
    await getEmployees();
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/employees?page=1&limit=10");
  });

  it("appends search and status as query params", async () => {
    await getEmployees({ search: "ada", status: "active" });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/employees?search=ada&status=active&page=1&limit=10",
    );
  });

  it("omits empty filter values", async () => {
    await getEmployees({ search: "", status: "active" });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/employees?status=active&page=1&limit=10");
  });

  it("supports team and supervisor filters", async () => {
    await getEmployees({ teamId: "team-1", team: "platform", supervisorId: "employee-1" });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/employees?teamId=team-1&team=platform&supervisorId=employee-1&page=1&limit=10",
    );
  });

  it("supports custom page and limit values", async () => {
    await getEmployees({ page: 2, limit: 25 });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/employees?page=2&limit=25");
  });

  it("supports sort query parameters", async () => {
    await getEmployees({ sortBy: "jobTitle", sortDirection: "desc" });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/employees?sortBy=jobTitle&sortDirection=desc&page=1&limit=10",
    );
  });
});
