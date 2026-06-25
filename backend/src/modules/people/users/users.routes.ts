import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { UsersController } from "./users.controller";

const usersController = new UsersController();

export const usersRouter = Router();

/** Lists users with pagination, filters, and optional server-side sorting. */
usersRouter.get("/", requireRole("ADMIN"), usersController.listUsers);

/** Creates a new Admin, HR, or Employee account with a linked employee profile. */
usersRouter.post("/", requireRole("ADMIN"), usersController.addUser);

/** Deactivates a user account without deleting records. */
usersRouter.patch("/:userId/deactivate", requireRole("ADMIN"), usersController.deactivateUser);

/** Re-activates a previously deactivated user account. */
usersRouter.patch("/:userId/activate", requireRole("ADMIN"), usersController.activateUser);

/** Changes a user's role between Admin, HR, and Employee. */
usersRouter.patch("/:userId/role", requireRole("ADMIN"), usersController.updateRole);
