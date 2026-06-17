"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/modules/auth/components/auth-provider";
import { ConfirmProvider } from "@/shared/components/common/confirm-dialog";
import { Toaster } from "@/shared/components/ui/sonner";

/** App-wide context providers: server-state (TanStack Query), auth, confirm dialogs, and toasts. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfirmProvider>
          {children}
          <Toaster />
        </ConfirmProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
