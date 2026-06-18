"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/use-auth";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  // Redirect in an effect, never during render — calling redirect()/router
  // methods while rendering races the active navigation and crashes React.
  useEffect(() => {
    if (!loading && !appUser) router.replace("/login");
  }, [loading, appUser, router]);

  if (loading || !appUser) {
    return <div className="min-h-screen bg-white" aria-busy="true" />;
  }

  return <>{children}</>;
}
