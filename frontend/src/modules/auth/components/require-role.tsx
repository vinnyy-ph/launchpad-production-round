"use client";

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "../hooks/use-auth";
import type { Role } from "../types/auth.types";

interface Props {
  allowedRoles: (Role | "SUPERVISOR")[];
  children: ReactNode;
}

export function RequireRole({ allowedRoles, children }: Props) {
  const { appUser, loading } = useAuth();
  if (loading) return null;
  if (!appUser) redirect("/login");

  const hasRole =
    allowedRoles.includes(appUser.role) ||
    (allowedRoles.includes("SUPERVISOR") && appUser.isSupervisor);

  if (!hasRole) redirect("/");
  return <>{children}</>;
}
