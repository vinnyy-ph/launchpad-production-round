import type { UserRole } from "../types/users.types";
import { Badge } from "@/shared/ui";

function roleBadgeVariant(role: UserRole): "error" | "warning" | "neutral" {
  if (role === "ADMIN") return "error";
  if (role === "HR") return "warning";
  return "neutral";
}

export function roleLabel(role: UserRole): string {
  if (role === "ADMIN") return "Admin";
  if (role === "HR") return "HR";
  return "Employee";
}

export function UserRoleBadge({ role }: { role: UserRole }) {
  return <Badge variant={roleBadgeVariant(role)}>{roleLabel(role)}</Badge>;
}
