
import { Router } from "express";
import { TeamsController } from "./teams.controller";

const teamsController = new TeamsController();

export const teamsRouter = Router();

/** Lists teams for HR directory management. */
// TODO: Re-enable authentication and HR authorization after temporary endpoint testing is complete.
teamsRouter.get("/", teamsController.listTeams);

/** Creates a team with a leader and members. */
// TODO: Re-enable authentication and HR authorization after temporary endpoint testing is complete.
teamsRouter.post("/", teamsController.createTeam);

/** Updates a team's display name without changing leader or member assignments. */
// TODO: Re-enable authentication and HR authorization after temporary endpoint testing is complete.
teamsRouter.patch("/:teamId", teamsController.updateTeamName);

/** Adds one or more members without replacing existing team membership. */
// TODO: Re-enable authentication and team-leader authorization after temporary endpoint testing is complete.
teamsRouter.post("/:teamId/members", teamsController.addTeamMembers);

/** Allows a team leader or HR workflow to replace members while preserving leader membership. */
// TODO: Re-enable authentication and team-leader authorization after temporary endpoint testing is complete.
teamsRouter.put("/:teamId/members", teamsController.updateTeamMembers);

/** Removes one or more members from a team while preventing leader removal. */
// TODO: Re-enable authentication and team-leader authorization after temporary endpoint testing is complete.
teamsRouter.delete("/:teamId/members", teamsController.removeTeamMembers);

/** Removes one member from a team while preventing leader removal. */
// TODO: Re-enable authentication and team-leader authorization after temporary endpoint testing is complete.
teamsRouter.delete("/:teamId/members/:employeeId", teamsController.removeTeamMember);
