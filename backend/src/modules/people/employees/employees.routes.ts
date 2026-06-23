import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { EmployeesController } from "./employees.controller";
import { ActivityLogController } from "../activity-log/activity-log.controller";
import { EmployeeDocumentsController } from "../employee-documents/employee-documents.controller";

const employeesController = new EmployeesController();
const activityLogController = new ActivityLogController();
const employeeDocumentsController = new EmployeeDocumentsController();

export const employeesRouter = Router();

/**
 * Lists employees. Any authenticated user may read the directory; HR/Admin receive the full
 * fields while everyone else receives a redacted list (sensitive fields omitted server-side).
 */
employeesRouter.get("/", employeesController.listEmployees);

/**
 * Lists the entire directory in one non-paginated payload for the org chart. Declared before
 * `/:employeeId` so "all" is not captured as an employee id. Any authenticated user may read it
 * (redacted for non-HR/Admin), matching the paginated list endpoint's access.
 */
employeesRouter.get("/all", employeesController.listAllEmployees);

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

/** Lists profile field edit history for one employee. Restricted to HR and Admin. */
employeesRouter.get(
  "/:employeeId/activity-logs",
  requireRole("ADMIN", "HR"),
  activityLogController.listEmployeeActivityLogs,
);

/** Lists documents uploaded by one employee. Restricted to HR and Admin. */
employeesRouter.get(
  "/:employeeId/documents",
  requireRole("ADMIN", "HR"),
  employeeDocumentsController.listEmployeeDocuments,
);
