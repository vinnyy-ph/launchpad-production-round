import type { Request, Response, NextFunction } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "../lib/firebase";
import { prisma } from "../lib/db";

// Verifies the Firebase ID token from `Authorization: Bearer <token>`, loads (or
// JIT-provisions) the matching app user, and blocks deactivated accounts. Other
// modules import this to protect their routes.
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    // First sign-in provisions the user; admins manage status afterward.
    const user = await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: { email: decoded.email ?? "", name: decoded.name ?? null },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? "",
        name: decoded.name ?? null,
      },
    });

    if (!user.isActive) {
      return res.status(403).json({ error: "Account deactivated" });
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}
