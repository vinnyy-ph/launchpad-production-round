import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "../../modules/auth/firebase.service";
import { prisma } from "../database/prisma.service";

// Verifies the Firebase ID token, then resolves the pre-created (invited) account
// by email and binds the Google uid on first sign-in. This is the universal login
// gate: it rejects un-invited emails and blocks the two distinct "cannot sign in"
// reasons — a deactivated account (User.isActive=false) and the Inactive employment
// status (Employee.status=INACTIVE).
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

  // Google emails are case-insensitive; normalize so the invited row matches.
  const email = decoded.email.toLowerCase();

  try {
    const account = await prisma.user.findUnique({
      where: { email },
      include: { employee: { select: { status: true } } },
    });

    // Invitation-gated: only pre-created accounts may sign in.
    if (!account) {
      return res
        .status(403)
        .json({ error: "No account for this email. Ask an admin for an invitation." });
    }

    // First sign-in binds the Google identity. The guarded update is atomic, so two
    // concurrent first sign-ins can't bind different uids; later sign-ins must match.
    if (!account.googleId) {
      const bound = await prisma.user.updateMany({
        where: { id: account.id, googleId: null },
        data: { googleId: decoded.uid },
      });
      if (bound.count === 0) {
        const fresh = await prisma.user.findUnique({ where: { id: account.id } });
        if (fresh?.googleId !== decoded.uid) {
          return res
            .status(403)
            .json({ error: "This email is linked to a different Google identity." });
        }
      }
      account.googleId = decoded.uid;
    } else if (account.googleId !== decoded.uid) {
      return res
        .status(403)
        .json({ error: "This email is linked to a different Google identity." });
    }

    // Two distinct login blocks.
    if (!account.isActive) {
      return res.status(403).json({ error: "Account deactivated" });
    }
    if (account.employee?.status === "INACTIVE") {
      return res.status(403).json({ error: "Account is inactive" });
    }

    req.user = account;
    return next();
  } catch (error) {
    return next(error);
  }
}
