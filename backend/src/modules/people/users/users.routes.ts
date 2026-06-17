import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { UsersController } from "./users.controller";

const usersController = new UsersController();

export const usersRouter = Router();

/** Lists users with optional role and active-status filters. */
usersRouter.get("/", requireRole("ADMIN"), usersController.listUsers);

/** Creates a new HR or Employee account. */
usersRouter.post("/", requireRole("ADMIN"), usersController.addUser);

/** Deactivates a user account without deleting records. */
usersRouter.patch("/:userId/deactivate", requireRole("ADMIN"), usersController.deactivateUser);

/** Changes a user's role between HR and Employee. */
usersRouter.patch("/:userId/role", requireRole("ADMIN"), usersController.updateRole);
