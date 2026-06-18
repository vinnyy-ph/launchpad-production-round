"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/modules/auth/components/require-auth";
import { RoleAwareShell } from "@/shared/components/layout/role-aware-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RoleAwareShell>{children}</RoleAwareShell>
    </RequireAuth>
  );
}
