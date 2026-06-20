import type { NextFunction, Request, Response } from "express";
import { EmployeeDocumentsService } from "./employee-documents.service";

/**
 * HTTP controller for listing an employee's uploaded documents.
 */
export class EmployeeDocumentsController {
  constructor(private readonly service = new EmployeeDocumentsService()) {}

  listEmployeeDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const result = await this.service.listEmployeeDocuments(employeeId);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };
}
