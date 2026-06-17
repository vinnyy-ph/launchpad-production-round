"use client";

import type { ReactNode } from "react";
import { RequireRole } from "@/modules/auth/components/require-role";

export default function HrLayout({ children }: { children: ReactNode }) {
  return <RequireRole allowedRoles={["HR", "ADMIN"]}>{children}</RequireRole>;
}
