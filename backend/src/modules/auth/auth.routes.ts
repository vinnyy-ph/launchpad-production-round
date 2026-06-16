import { Router } from "express";
import { authenticate } from "../../core/middleware/auth.middleware";
import { getSession } from "./auth.controller";

export const authRoutes = Router();

// Exchange a verified Firebase token for the resolved app session.
authRoutes.post("/session", authenticate, getSession);
