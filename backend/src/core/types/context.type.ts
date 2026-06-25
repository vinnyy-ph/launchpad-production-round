import type { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      // Firebase uid from the verified ID token (set by authenticate).
      firebaseUid?: string;
      // Google profile picture URL from the verified ID token (set by authenticate);
      // null when the account has no photo. Persisted on the User at session bootstrap.
      firebasePicture?: string | null;
    }
  }
}

export {};
