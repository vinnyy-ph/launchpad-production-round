import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { appUser, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!appUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
