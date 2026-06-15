import { ReactNode } from "react";
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
    return <div>Not authenticated</div>;
  }

  return <>{children}</>;
}
