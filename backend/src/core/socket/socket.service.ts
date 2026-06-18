import type { Server as HttpServer } from "http";
import { Server } from "socket.io";

let io: Server | null = null;

/**
 * Initializes the Socket.IO server on the shared HTTP server.
 * Clients join a room named after their user ID so notifications can be targeted per user.
 */
export function initSocket(httpServer: HttpServer): Server {
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");

  io = new Server(httpServer, {
    cors: {
      origin: origins,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;

    if (userId) {
      socket.join(`user:${userId}`);
    }
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
