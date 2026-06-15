import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/shared/lib/api-client";
import type { AppUser } from "../types/auth.types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setAppUser(null);
        setLoading(false);
        return;
      }
      try {
        const session = await apiFetch<AppUser>("/api/auth/session", {
          method: "POST",
        });
        setUser(firebaseUser);
        setAppUser(session);
      } catch {
        await signOut(auth);
        setUser(null);
        setAppUser(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return { user, appUser, loading };
}
