import { Router } from "express";
import { DepartmentsController } from "./departments.controller";

const departmentsController = new DepartmentsController();

export const departmentsRouter = Router();

/** Lists departments from the normalized departments table. */
departmentsRouter.get("/", departmentsController.listDepartments);
