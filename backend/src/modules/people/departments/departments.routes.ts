import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { DepartmentsController } from "./departments.controller";

const departmentsController = new DepartmentsController();

export const departmentsRouter = Router();

/** Lists departments with search, sorting, and pagination. Any authenticated user may read. */
departmentsRouter.get("/", departmentsController.listDepartments);

/** Creates a department. Restricted to HR and Admin. */
departmentsRouter.post("/", requireRole("ADMIN", "HR"), departmentsController.createDepartment);

/** Renames a department. Restricted to HR and Admin. */
departmentsRouter.patch(
  "/:departmentId",
  requireRole("ADMIN", "HR"),
  departmentsController.updateDepartment,
);

/** Soft-deletes a department (blocked when employees are assigned). Restricted to HR and Admin. */
departmentsRouter.delete(
  "/:departmentId",
  requireRole("ADMIN", "HR"),
  departmentsController.deleteDepartment,
);
