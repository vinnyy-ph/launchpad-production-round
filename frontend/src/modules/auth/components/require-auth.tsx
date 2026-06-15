import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/use-auth";

/** Renders children only for signed-in users; otherwise redirects to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null; // AppRouter shows the splash while auth resolves
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
