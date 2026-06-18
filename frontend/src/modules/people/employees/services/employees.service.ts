import { readCollection } from "@/shared/mock/db";
import type { DemoEmployee } from "@/shared/mock/seed";
import type { EmployeeFilters, EmployeeListItem } from "../types/employees.types";

const COLLECTION = "employees";

function toListItem(e: DemoEmployee, allEmployees: DemoEmployee[]): EmployeeListItem {
  const [firstName, ...rest] = (e.displayName ?? "").split(" ");
  const supervisor = e.supervisorId
    ? allEmployees.find((s) => s.employeeId === e.supervisorId) ?? null
    : null;
  return {
    id: e.employeeId,
    firstName: firstName || null,
    lastName: rest.join(" ") || null,
    companyEmail: e.email,
    jobTitle: e.jobTitle ?? null,
    departmentName: e.department ?? null,
    supervisorName: supervisor?.displayName ?? null,
    employeeStatus: e.employeeStatus,
  };
}

// Reads the mock employee collection (no backend). Filters are applied in-memory.
export function getEmployees(filters: EmployeeFilters = {}): Promise<EmployeeListItem[]> {
  const allEmployees = readCollection<DemoEmployee>(COLLECTION);
  let rows = allEmployees.map((e) => toListItem(e, allEmployees));

  if (filters.status) {
    rows = rows.filter((r) => r.employeeStatus === filters.status);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter((r) =>
      [r.firstName, r.lastName, r.companyEmail]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  return Promise.resolve(rows);
}
