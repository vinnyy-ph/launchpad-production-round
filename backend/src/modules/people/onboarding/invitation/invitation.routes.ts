import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { InvitationController } from "./invitation.controller";

const invitationController = new InvitationController();

export const invitationRouter = Router();

/** HR or Admin only — manage onboarding invitations. */
invitationRouter.post(
  "/:recordId/send",
  requireRole("HR", "ADMIN"),
  invitationController.sendInvitation,
);
invitationRouter.post(
  "/:invitationId/resend",
  requireRole("HR", "ADMIN"),
  invitationController.resendInvitation,
);
invitationRouter.patch(
  "/:invitationId/email",
  requireRole("HR", "ADMIN"),
  invitationController.updateInvitationEmail,
);
invitationRouter.get(
  "/:recordId",
  requireRole("HR", "ADMIN"),
  invitationController.getInvitationStatus,
);
