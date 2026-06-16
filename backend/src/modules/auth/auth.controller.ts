import type { Request, Response } from "express";
import { resolveSession } from "./auth.service";

// POST /api/auth/session — exchanges a verified Firebase token for the resolved app
// session the frontend routes on. authenticate() is the gate: invitation, deactivated,
// and Inactive-status are all blocked there before this runs.
export async function getSession(req: Request, res: Response) {
  const session = await resolveSession(req.user!);
  return res.json(session);
}
