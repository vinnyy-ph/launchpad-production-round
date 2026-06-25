"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/modules/auth/components/require-auth";
import { RoleAwareShell } from "@/shared/components/layout/role-aware-shell";
import { SettingsModal } from "@/modules/settings/components/settings-modal";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RoleAwareShell>{children}</RoleAwareShell>
      <SettingsModal />
    </RequireAuth>
  );
}
