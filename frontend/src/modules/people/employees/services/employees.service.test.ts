vi.mock("@/shared/lib/api-client", () => ({
  apiFetch: vi.fn(() => Promise.resolve([])),
}));

import { apiFetch } from "@/shared/lib/api-client";
import { getEmployees } from "./employees.service";

describe("getEmployees", () => {
  afterEach(() => vi.clearAllMocks());

  it("calls the bare endpoint when no filters are given", async () => {
    await getEmployees();
    expect(apiFetch).toHaveBeenCalledWith("/api/employees");
  });

  it("appends search and status as query params", async () => {
    await getEmployees({ search: "ada", status: "ACTIVE" });
    expect(apiFetch).toHaveBeenCalledWith("/api/employees?search=ada&status=ACTIVE");
  });

  it("omits empty filter values", async () => {
    await getEmployees({ search: "", status: "ACTIVE" });
    expect(apiFetch).toHaveBeenCalledWith("/api/employees?status=ACTIVE");
  });
});
