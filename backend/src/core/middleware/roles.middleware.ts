import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

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
