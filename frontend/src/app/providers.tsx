import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/modules/auth/components/auth-provider";
import { Toaster } from "@/shared/components/ui/sonner";

/** App-wide context providers. Currently routing + toasts; add query/theme providers here as they land. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
