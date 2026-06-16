import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/shared/components/ui/sonner";

/** App-wide context providers. Currently routing + toasts; add query/theme providers here as they land. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      {children}
      <Toaster />
    </BrowserRouter>
  );
}
