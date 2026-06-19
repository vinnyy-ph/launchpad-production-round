"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { useAuth } from "@/modules/auth/hooks/use-auth";

// The backend Socket.IO server runs on the API origin (its own port), so the socket
// connects there directly rather than through the Next API proxy.
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const NOTIFICATION_EVENT = "notification";

/**
 * Keeps the notification bell live. While signed in, opens an authenticated Socket.IO
 * connection and invalidates the notification cache whenever the server pushes a new
 * in-app notification, so the unread badge and dropdown update in real time without
 * polling. Reuses the Firebase ID token (same credential as the REST API); the server
 * resolves the user from it, so the client never asserts its own identity.
 */
export function useNotificationSocket(): void {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  const userId = appUser?.userId;

  useEffect(() => {
    if (!userId) return;

    let socket: Socket | null = null;
    let active = true;

    void import("socket.io-client").then(({ io }) => {
      if (!active) return;

      socket = io(SOCKET_URL, {
        withCredentials: true,
        // Function form so a fresh token is fetched on every (re)connect — survives the
        // ~1h Firebase token expiry without dropping the live feed.
        auth: (cb) => {
          void (async () => {
            const { getFirebaseAuth } = await import("@/shared/lib/firebase");
            const token = (await getFirebaseAuth().currentUser?.getIdToken()) ?? "";
            cb({ token });
          })();
        },
      });

      socket.on(NOTIFICATION_EVENT, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      });
    });

    return () => {
      active = false;
      socket?.disconnect();
    };
  }, [userId, queryClient]);
}
