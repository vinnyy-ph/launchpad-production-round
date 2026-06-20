jest.mock("@/shared/lib/api-client", () => ({
  apiFetch: jest.fn(() =>
    Promise.resolve({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
  ),
}));

import { apiFetch } from "@/shared/lib/api-client";
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  getDepartmentsPage,
  updateDepartment,
} from "@/modules/people/departments/services/departments.service";

const BASE = "/api/v1/departments";

describe("departments.service — read", () => {
  afterEach(() => jest.clearAllMocks());

  it("getDepartments requests every active department for dropdowns", async () => {
    await getDepartments();
    expect(apiFetch).toHaveBeenCalledWith(`${BASE}?limit=100`);
  });

  it("getDepartmentsPage applies default pagination", async () => {
    await getDepartmentsPage();
    expect(apiFetch).toHaveBeenCalledWith(`${BASE}?page=1&limit=10`);
  });

  it("getDepartmentsPage forwards search, sort, and custom pagination", async () => {
    await getDepartmentsPage({
      search: "eng",
      sortBy: "employeeCount",
      sortDirection: "desc",
      page: 3,
      limit: 25,
    });
    expect(apiFetch).toHaveBeenCalledWith(
      `${BASE}?search=eng&sortBy=employeeCount&sortDirection=desc&page=3&limit=25`,
    );
  });

  it("getDepartmentsPage omits empty search", async () => {
    await getDepartmentsPage({ page: 1, limit: 10 });
    expect(apiFetch).toHaveBeenCalledWith(`${BASE}?page=1&limit=10`);
  });
});

describe("departments.service — write", () => {
  afterEach(() => jest.clearAllMocks());

  it("createDepartment POSTs the trimmed name payload", async () => {
    await createDepartment({ name: "Engineering" });
    expect(apiFetch).toHaveBeenCalledWith(BASE, {
      method: "POST",
      body: JSON.stringify({ name: "Engineering" }),
    });
  });

  it("updateDepartment PATCHes the department by id", async () => {
    await updateDepartment("d1", { name: "Platform" });
    expect(apiFetch).toHaveBeenCalledWith(`${BASE}/d1`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Platform" }),
    });
  });

  it("deleteDepartment DELETEs the department by id", async () => {
    await deleteDepartment("d1");
    expect(apiFetch).toHaveBeenCalledWith(`${BASE}/d1`, { method: "DELETE" });
  });
});
