"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/shared/ui";
import { useAuth } from "../hooks/use-auth";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  // Redirect in an effect, never during render — calling redirect()/router
  // methods while rendering races the active navigation and crashes React.
  useEffect(() => {
    if (!loading && !appUser) router.replace("/login");
  }, [loading, appUser, router]);

  if (loading || !appUser) {
    // Full-surface wait → app-shell skeleton (brandbook: shimmer on full surfaces, never a spinner).
    return (
      <div
        className="flex min-h-screen bg-white"
        aria-busy="true"
        aria-label="Loading your workspace"
      >
        {/* Sidebar rail */}
        <div className="hidden w-64 shrink-0 flex-col gap-2 border-r border-[color:var(--border-primary)] p-4 md:flex">
          <Skeleton className="h-8 w-32" />
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-16 items-center justify-between border-b border-[color:var(--border-primary)] px-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <div className="flex-1 space-y-4 p-6">
            <Skeleton className="h-8 w-1/3" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
