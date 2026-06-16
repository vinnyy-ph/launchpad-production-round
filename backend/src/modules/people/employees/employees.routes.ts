import { Router } from "express";
import { EmployeesController } from "./employees.controller";

const employeesController = new EmployeesController();

export const employeesRouter = Router();

/** Lists employees with optional search, filters, and pagination. */
// TODO: Re-enable authentication after temporary endpoint testing is complete.
employeesRouter.get("/", employeesController.listEmployees);
