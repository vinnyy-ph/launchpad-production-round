import { useEffect, type ReactNode } from "react";
import { initAuthListener } from "../stores/auth.store";

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAuthListener();
  }, []);

  return children;
}
