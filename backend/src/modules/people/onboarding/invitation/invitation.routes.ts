import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { InvitationController } from "./invitation.controller";

const invitationController = new InvitationController();

export const invitationRouter = Router();

/** HR only — manage onboarding invitations. */
invitationRouter.post(
  "/:recordId/send",
  requireRole("HR"),
  invitationController.sendInvitation,
);
invitationRouter.post(
  "/:invitationId/resend",
  requireRole("HR"),
  invitationController.resendInvitation,
);
invitationRouter.patch(
  "/:invitationId/email",
  requireRole("HR"),
  invitationController.updateInvitationEmail,
);
invitationRouter.get(
  "/:recordId",
  requireRole("HR"),
  invitationController.getInvitationStatus,
);
