import type { NextFunction, Request, Response } from "express";
import type { ListDepartmentsResponseDto } from "./dto";
import { DepartmentsService } from "./departments.service";

/** HTTP controller for department endpoints. */
export class DepartmentsController {
  constructor(private readonly departmentsService = new DepartmentsService()) {}

  /** Handles GET /api/v1/departments for HR dropdown options. */
  listDepartments = async (
    _req: Request,
    res: Response<ListDepartmentsResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.departmentsService.listDepartments();
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };
}
