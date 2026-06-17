"use client";

import type { ReactNode } from "react";
import { RequireRole } from "@/modules/auth/components/require-role";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireRole allowedRoles={["ADMIN"]}>{children}</RequireRole>;
}
