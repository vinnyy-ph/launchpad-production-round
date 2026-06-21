import { DepartmentsValidation } from "./departments.validation";

const validation = new DepartmentsValidation();

describe("DepartmentsValidation.parseListFilters", () => {
  it("applies pagination defaults when params are missing", () => {
    expect(validation.parseListFilters({})).toEqual({
      page: 1,
      limit: 10,
      search: undefined,
      sortBy: undefined,
      sortDirection: undefined,
    });
  });

  it("normalizes search, sort, and pagination input", () => {
    expect(
      validation.parseListFilters({
        search: "  eng  ",
        sortBy: "employeeCount",
        sortDirection: "DESC",
        page: "3",
        limit: "25",
      }),
    ).toEqual({
      page: 3,
      limit: 25,
      search: "eng",
      sortBy: "employeeCount",
      sortDirection: "desc",
    });
  });

  it("caps limit at the maximum and ignores unknown sort keys", () => {
    const result = validation.parseListFilters({ limit: "500", sortBy: "bogus" });
    expect(result.limit).toBe(100);
    expect(result.sortBy).toBeUndefined();
  });
});

describe("DepartmentsValidation.parseCreateBody / parseUpdateBody", () => {
  it("trims a valid name", () => {
    expect(validation.parseCreateBody({ name: "  Engineering  " })).toEqual({
      name: "Engineering",
    });
    expect(validation.parseUpdateBody({ name: "Platform" })).toEqual({ name: "Platform" });
  });

  it("rejects a missing or empty name", () => {
    expect(() => validation.parseCreateBody({})).toThrow("Department name is required");
    expect(() => validation.parseCreateBody({ name: "   " })).toThrow(
      "Department name is required",
    );
  });

  it("rejects a name over the length limit", () => {
    expect(() => validation.parseCreateBody({ name: "x".repeat(101) })).toThrow(
      "Department name is too long",
    );
  });
});

describe("DepartmentsValidation.parseParams", () => {
  it("returns the department id when present", () => {
    expect(validation.parseParams({ departmentId: "d1" })).toEqual({ departmentId: "d1" });
  });

  it("rejects a missing department id", () => {
    expect(() => validation.parseParams({})).toThrow("Department id is required");
  });
});
