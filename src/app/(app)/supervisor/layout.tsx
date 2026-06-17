"use client";

import type { ReactNode } from "react";
import { RequireRole } from "@/modules/auth/components/require-role";

export default function SupervisorLayout({ children }: { children: ReactNode }) {
  return <RequireRole allowedRoles={["SUPERVISOR", "ADMIN"]}>{children}</RequireRole>;
}
