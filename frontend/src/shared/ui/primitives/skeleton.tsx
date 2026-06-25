import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-md", className)} {...props} />;
}

export { Skeleton };
