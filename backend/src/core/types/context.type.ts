import type { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      // Firebase uid from the verified ID token (set by authenticate).
      firebaseUid?: string;
    }
  }
}

export {};
