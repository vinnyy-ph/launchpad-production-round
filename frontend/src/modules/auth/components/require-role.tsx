"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/use-auth";
import { roleHome } from "../role-home";
import type { Role } from "../types/auth.types";

interface Props {
  allowedRoles: (Role | "SUPERVISOR")[];
  children: ReactNode;
}

export function RequireRole({ allowedRoles, children }: Props) {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  const hasRole =
    !!appUser &&
    (allowedRoles.includes(appUser.role) ||
      (allowedRoles.includes("SUPERVISOR") && appUser.isSupervisor));

  // Redirect in an effect, never during render. On a role mismatch send the
  // user to their OWN home (roleHome) — the same target the role switcher
  // pushes to — so the two navigations agree instead of racing to "/".
  useEffect(() => {
    if (loading) return;
    if (!appUser) {
      router.replace("/login");
    } else if (!hasRole) {
      router.replace(roleHome(appUser));
    }
  }, [loading, appUser, hasRole, router]);

  if (loading || !appUser || !hasRole) return null;
  return <>{children}</>;
}
