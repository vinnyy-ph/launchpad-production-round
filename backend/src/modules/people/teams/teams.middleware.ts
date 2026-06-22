import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { TeamsRepository } from "./teams.repository";

/** Roles that may manage any team's membership regardless of leadership. */
const PRIVILEGED_ROLES: Role[] = ["ADMIN", "HR"];

/**
 * Forbidden response body. Kept identical to the shared `requireRole` rejection so callers and
 * tests see one consistent shape for "not allowed to manage this team".
 */
const FORBIDDEN_BODY = {
  success: false,
  message: "You do not have permission to perform this action",
};

/**
 * Authorizes team membership mutations (add/remove members) on the team named by `:teamId`.
 *
 * HR and Admin may manage any team. Any other authenticated caller is allowed only when they are
 * the leader of that specific team — a team leader's sole extra ability is adding and removing its
 * members. Everyone else is rejected with 403. Renaming and team creation remain HR/Admin-only and
 * are guarded separately by `requireRole`.
 *
 * Must run after `authenticate` (so `req.user` is set) on routes that expose a `:teamId` param.
 */
export function requireTeamManager(teamsRepository = new TeamsRepository()) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    try {
      const employeeId = await teamsRepository.findEmployeeIdByUserId(req.user.id);

      if (employeeId) {
        const team = await teamsRepository.findById(req.params.teamId);

        if (team && team.leaderId === employeeId) {
          return next();
        }
      }

      return res.status(403).json(FORBIDDEN_BODY);
    } catch (error) {
      return next(error);
    }
  };
}
