import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "../../modules/auth/firebase.service";
import { prisma } from "../database/prisma.service";

// Per-request login gate — a pure read. Verifies the Firebase ID token, resolves the
// pre-created (invited) account by email, and enforces the two distinct "cannot sign
// in" blocks on every request: a deactivated account (User.isActive=false) and the
// Inactive employment status (Employee.status=INACTIVE). Binding the Google uid on
// first sign-in is an admission write owned by POST /api/auth/session, not this guard.
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

    // Once bound, the account is pinned to one Google identity.
    if (account.googleId && account.googleId !== decoded.uid) {
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
    req.firebaseUid = decoded.uid;
    return next();
  } catch (error) {
    return next(error);
  }
}
