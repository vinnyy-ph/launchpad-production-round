
import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { TeamsController } from "./teams.controller";

const teamsController = new TeamsController();

export const teamsRouter = Router();

/** Lists teams. Any authenticated user may view the team/org directory. */
teamsRouter.get("/", teamsController.listTeams);

/** Creates a team with a leader and members. Restricted to HR and Admin. */
teamsRouter.post("/", requireRole("ADMIN", "HR"), teamsController.createTeam);

/** Updates a team's display name. Restricted to HR and Admin. */
teamsRouter.patch("/:teamId", requireRole("ADMIN", "HR"), teamsController.updateTeamName);

/** Adds one or more members without replacing existing membership. Restricted to HR and Admin. */
teamsRouter.post("/:teamId/members", requireRole("ADMIN", "HR"), teamsController.addTeamMembers);

/** Replaces members while preserving leader membership. Restricted to HR and Admin. */
teamsRouter.put("/:teamId/members", requireRole("ADMIN", "HR"), teamsController.updateTeamMembers);

/** Removes one or more members while preventing leader removal. Restricted to HR and Admin. */
teamsRouter.delete("/:teamId/members", requireRole("ADMIN", "HR"), teamsController.removeTeamMembers);

/** Removes one member while preventing leader removal. Restricted to HR and Admin. */
teamsRouter.delete(
  "/:teamId/members/:employeeId",
  requireRole("ADMIN", "HR"),
  teamsController.removeTeamMember,
);
