"use client";

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "../hooks/use-auth";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { appUser, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-white" aria-busy="true" />;
  }

  if (!appUser) {
    redirect("/login");
  }

  return <>{children}</>;
}
