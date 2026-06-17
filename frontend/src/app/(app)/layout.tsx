"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/modules/auth/components/require-auth";
import { AppShell } from "@/shared/components/layout/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
