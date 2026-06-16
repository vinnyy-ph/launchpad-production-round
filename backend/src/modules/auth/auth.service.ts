import type { User } from "@prisma/client";
import { prisma } from "../../core/database/prisma.service";

export interface SessionUser {
  userId: string;
  employeeId: string | null;
  role: "ADMIN" | "HR" | "EMPLOYEE";
  isSupervisor: boolean;
  isActive: boolean;
  email: string;
  displayName: string | null;
}

// The live DB still carries a legacy stored SUPERVISOR role; the aligned model
// keeps Role to {ADMIN, HR, EMPLOYEE} and derives Supervisor from the org graph.
// Normalize so the API never returns SUPERVISOR as a stored role.
function normalizeRole(role: string): SessionUser["role"] {
  return role === "ADMIN" || role === "HR" ? role : "EMPLOYEE";
}

// Resolves a verified account into the app session the frontend routes on.
// Supervisor and active-ness are derived, never read from a stored flag.
export async function resolveSession(user: User): Promise<SessionUser> {
  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true, lastName: true, status: true },
  });

  // Supervisor = an employee with at least one direct report (org-graph derived).
  const isSupervisor =
    employee != null &&
    (await prisma.employee.count({ where: { supervisorId: employee.id } })) > 0;

  return {
    userId: user.id,
    employeeId: employee?.id ?? null,
    role: normalizeRole(user.role),
    isSupervisor,
    isActive: user.isActive && employee?.status !== "INACTIVE",
    email: user.email,
    displayName: employee ? `${employee.firstName} ${employee.lastName}` : null,
  };
}
