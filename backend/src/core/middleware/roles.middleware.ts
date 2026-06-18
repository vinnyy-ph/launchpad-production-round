import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../globals";
import { prisma } from "../database/prisma.service";

/**
 * Restricts a route to users whose role is one of the allowed roles.
 * Must run after authenticate so req.user is set.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    return next();
  };
}

/**
 * Restricts a route to employees who have at least one direct report.
 * Supervisor is derived from the org graph, not stored as a role.
 * Must run after authenticate so req.user is set.
 */
export async function requireSupervisor(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({ error: "Not authenticated" });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    if (!employee) {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: API_ERROR_MESSAGES.NOT_A_SUPERVISOR,
        errorCode: API_ERROR_CODES.NOT_A_SUPERVISOR,
      });
    }

    const directReportCount = await prisma.employee.count({
      where: { supervisorId: employee.id },
    });

    if (directReportCount === 0) {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: API_ERROR_MESSAGES.NOT_A_SUPERVISOR,
        errorCode: API_ERROR_CODES.NOT_A_SUPERVISOR,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
