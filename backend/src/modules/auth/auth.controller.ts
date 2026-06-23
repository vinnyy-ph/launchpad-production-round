import type { Request, Response } from "express";
import { bindGoogleId, recordLastLogin, resolveSession } from "./auth.service";

// POST /api/auth/session — the admission / bootstrap endpoint. authenticate() has
// already verified the token and enforced the invitation gate + both login blocks;
// here we bind the Google identity on first sign-in, then return the resolved app
// session the frontend routes on.
export async function getSession(req: Request, res: Response) {
  const bound = await bindGoogleId(req.user!, req.firebaseUid!);
  if (!bound) {
    return res
      .status(403)
      .json({ error: "This email is linked to a different Google identity." });
  }
  await recordLastLogin(req.user!.id, req.firebasePicture ?? null);
  const session = await resolveSession(req.user!);
  return res.json(session);
}
