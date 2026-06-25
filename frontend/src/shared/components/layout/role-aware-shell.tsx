"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { AppShell } from "./app-shell";
import { OnboardingShell } from "./onboarding-shell";

const ONBOARDING_ROUTE = "/employee/onboarding";

/**
 * Chooses the shell by lifecycle status. A still-onboarding hire is locked into
 * the wizard (the focused OnboardingShell) and bounced back if they reach for any
 * other route — no wandering a half-empty app until they're Active. Everyone else
 * gets the full AppShell.
 */
export function RoleAwareShell({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const onboarding = appUser?.employeeStatus === "ONBOARDING";

  // Redirect in an effect, never during render (mirrors RequireAuth).
  useEffect(() => {
    if (onboarding && pathname !== ONBOARDING_ROUTE) {
      router.replace(ONBOARDING_ROUTE);
    }
  }, [onboarding, pathname, router]);

  // reducedMotion="user" → framer-motion drops movement (keeps a soft fade) when the
  // OS "reduce motion" setting is on. Set once here so every animated surface honors it.
  if (onboarding) {
    // Render the wizard only on its canonical route; otherwise show empty chrome
    // for the one frame before the redirect lands (avoids flashing another page).
    return (
      <MotionConfig reducedMotion="user">
        <OnboardingShell>{pathname === ONBOARDING_ROUTE ? children : null}</OnboardingShell>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <AppShell>{children}</AppShell>
    </MotionConfig>
  );
}
