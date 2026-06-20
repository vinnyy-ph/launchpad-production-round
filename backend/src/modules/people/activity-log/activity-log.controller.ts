import type { NextFunction, Request, Response } from "express";
import { ActivityLogService } from "./activity-log.service";

export class ActivityLogController {
  constructor(private readonly service = new ActivityLogService()) {}

  listEmployeeActivityLogs = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { employeeId } = req.params;
      const result = await this.service.getActivityLogs(employeeId);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };
}
