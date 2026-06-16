import { Router } from "express";
import { EmployeesController } from "./employees.controller";

const employeesController = new EmployeesController();

export const employeesRouter = Router();

/** Lists employees with optional search, filters, and pagination. */
// TODO: Re-enable authentication after temporary endpoint testing is complete.
employeesRouter.get("/", employeesController.listEmployees);

/** Gets one unredacted employee profile for HR directory views. */
// TODO: Re-enable authentication and HR authorization after temporary endpoint testing is complete.
employeesRouter.get("/:employeeId", employeesController.getEmployeeProfile);
