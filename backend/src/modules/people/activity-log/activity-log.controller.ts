import type { NextFunction, Request, Response } from "express";
import { API_ERROR_MESSAGES, HTTP_STATUS_CODES } from "../../../core/globals";
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

  /** Handles GET /api/v1/employees/me/activity-logs — the caller's OWN edit history (any role). */
  listMyActivityLogs = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const result = await this.service.getMyActivityLogs(req.user.id);
      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Employee not found") {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
        });
      }

      return next(error);
    }
  };
}
