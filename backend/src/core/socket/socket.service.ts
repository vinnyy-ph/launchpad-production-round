import type { Server as HttpServer } from "http";
import { Server } from "socket.io";

let io: Server | null = null;

/**
 * Initializes the Socket.IO server on the shared HTTP server.
 * Clients authenticate with their Firebase ID token (the same credential the REST API
 * uses); the user id is resolved server-side from the verified token and used as the
 * room name, so a socket can only ever join its own room.
 */
export function initSocket(httpServer: HttpServer): Server {
  // Defaults to the Next.js dev origin; set CORS_ORIGIN to the deployed frontend in prod.
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",");

  io = new Server(httpServer, {
    cors: {
      origin: origins,
      credentials: true,
    },
  });

  // Handshake guard — mirrors the REST `authenticate` middleware. The userId is derived
  // from the verified token, never trusted from the client, so no socket can subscribe
  // to another user's notification stream.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      // Loaded lazily (only on a real handshake) so the socket module doesn't drag
      // firebase-admin into every importer's graph — keeps service unit tests light.
      const { adminAuth } = await import("../../modules/auth/firebase.service");
      const { prisma } = await import("../database/prisma.service");

      const decoded = await adminAuth.verifyIdToken(token);
      const email = decoded.email?.toLowerCase();
      if (!email) {
        return next(new Error("Unauthorized"));
      }

      const account = await prisma.user.findUnique({
        where: { email },
        include: { employee: { select: { status: true } } },
      });

      if (
        !account ||
        !account.isActive ||
        (account.googleId && account.googleId !== decoded.uid) ||
        account.employee?.status === "INACTIVE"
      ) {
        return next(new Error("Unauthorized"));
      }

      socket.data.userId = account.id;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
  });

  return io;
}

/** Returns the initialized Socket.IO server, or null when not yet started (e.g. in tests). */
export function getIo(): Server | null {
  return io;
}

/** Emits a real-time event to a specific user's room. No-op when Socket.IO is not initialized. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}
