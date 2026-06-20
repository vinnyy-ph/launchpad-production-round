import { DepartmentsService } from "./departments.service";
import type { DepartmentsRepository } from "./departments.repository";

// The service eagerly imports the repository, which initializes the Prisma client at
// module load. These tests inject a fake repository, so a bare prisma stub is enough.
jest.mock("../../../core/database/prisma.service", () => ({ prisma: {} }));

/** Builds a Prisma-shaped department record as returned by the repository select. */
function record(overrides: Partial<{ id: string; name: string; employees: number }> = {}) {
  const { id = "d1", name = "Engineering", employees = 0 } = overrides;
  return {
    id,
    name,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    _count: { employees },
  };
}

/** A configurable fake repository; only the methods each test needs are overridden. */
function fakeRepo(overrides: Partial<DepartmentsRepository> = {}): DepartmentsRepository {
  const base: Partial<DepartmentsRepository> = {
    findMany: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByName: jest.fn().mockResolvedValue(null),
    findActiveByNameInsensitive: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(record()),
    restore: jest.fn().mockResolvedValue(record()),
    update: jest.fn().mockResolvedValue(record()),
    softDelete: jest.fn().mockResolvedValue(record()),
    countEmployees: jest.fn().mockResolvedValue(0),
  };
  return { ...base, ...overrides } as DepartmentsRepository;
}

describe("DepartmentsService.createDepartment", () => {
  it("rejects a name already used by an active department", async () => {
    const repo = fakeRepo({
      findActiveByNameInsensitive: jest.fn().mockResolvedValue({ id: "other" }),
    });
    const service = new DepartmentsService(repo);

    await expect(service.createDepartment({ name: "Engineering" })).rejects.toThrow(
      "Department already exists",
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("restores a soft-deleted department that holds the same name", async () => {
    const restore = jest.fn().mockResolvedValue(record({ id: "d9", name: "Sales" }));
    const repo = fakeRepo({
      findByName: jest.fn().mockResolvedValue({ id: "d9", deletedAt: new Date() }),
      restore,
    });
    const service = new DepartmentsService(repo);

    const result = await service.createDepartment({ name: "Sales" });

    expect(restore).toHaveBeenCalledWith("d9", "Sales");
    expect(repo.create).not.toHaveBeenCalled();
    expect(result.data.id).toBe("d9");
  });

  it("creates a new department when the name is free", async () => {
    const create = jest.fn().mockResolvedValue(record({ name: "Marketing" }));
    const repo = fakeRepo({ create });
    const service = new DepartmentsService(repo);

    const result = await service.createDepartment({ name: "Marketing" });

    expect(create).toHaveBeenCalledWith("Marketing");
    expect(result.data.name).toBe("Marketing");
  });
});

describe("DepartmentsService.deleteDepartment", () => {
  it("blocks deletion while employees are assigned", async () => {
    const softDelete = jest.fn();
    const repo = fakeRepo({
      findById: jest.fn().mockResolvedValue(record({ employees: 3 })),
      countEmployees: jest.fn().mockResolvedValue(3),
      softDelete,
    });
    const service = new DepartmentsService(repo);

    await expect(service.deleteDepartment({ departmentId: "d1" })).rejects.toThrow(
      "Department has assigned employees",
    );
    expect(softDelete).not.toHaveBeenCalled();
  });

  it("soft-deletes a department with no employees", async () => {
    const softDelete = jest.fn().mockResolvedValue(record());
    const repo = fakeRepo({
      findById: jest.fn().mockResolvedValue(record()),
      countEmployees: jest.fn().mockResolvedValue(0),
      softDelete,
    });
    const service = new DepartmentsService(repo);

    await service.deleteDepartment({ departmentId: "d1" });

    expect(softDelete).toHaveBeenCalledWith("d1");
  });

  it("rejects deletion of a missing department", async () => {
    const repo = fakeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const service = new DepartmentsService(repo);

    await expect(service.deleteDepartment({ departmentId: "missing" })).rejects.toThrow(
      "Department not found",
    );
  });
});

describe("DepartmentsService.updateDepartment", () => {
  it("rejects renaming a department that does not exist", async () => {
    const repo = fakeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const service = new DepartmentsService(repo);

    await expect(
      service.updateDepartment({ departmentId: "missing" }, { name: "New" }),
    ).rejects.toThrow("Department not found");
  });
});
