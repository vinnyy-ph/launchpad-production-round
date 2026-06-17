import * as React from "react";
import { cn } from "@/shared/lib/utils";

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex flex-col gap-2 sm:flex-row sm:items-center", className)}>{children}</div>;
}
