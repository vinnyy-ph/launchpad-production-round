import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "../../modules/auth/firebase.service";
import { prisma } from "../database/prisma.service";

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

  if (!decoded.email) {
    return res.status(401).json({ error: "Authenticated account has no email" });
  }

  try {
    const user = await prisma.user.upsert({
      where: { googleId: decoded.uid },
      update: { email: decoded.email },
      create: {
        email: decoded.email,
        googleId: decoded.uid,
      },
    });

    if (!user.isActive) {
      return res.status(403).json({ error: "Account deactivated" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
