import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { EmployeesController } from "./employees.controller";

const employeesController = new EmployeesController();

export const employeesRouter = Router();

/**
 * Lists employees. Any authenticated user may read the directory; HR/Admin receive the full
 * fields while everyone else receives a redacted list (sensitive fields omitted server-side).
 */
employeesRouter.get("/", employeesController.listEmployees);

/**
 * Gets one employee profile. HR/Admin and the subject get the full profile; any other
 * authenticated viewer (including supervisors of the subject) gets a redacted profile.
 * Redaction is enforced server-side in the service serializer.
 */
employeesRouter.get("/:employeeId", employeesController.getEmployeeProfile);

/** Updates one employee profile. Restricted to HR and Admin. */
employeesRouter.patch(
  "/:employeeId",
  requireRole("ADMIN", "HR"),
  employeesController.updateEmployeeProfile,
);
