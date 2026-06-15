import type { User } from "@prisma/client";

// Attach the authenticated app user to the Express request (set by authenticate).
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
