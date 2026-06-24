"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { fadeDown } from "@/shared/lib/motion";

/**
 * Plays the Jia entrance (fadeDown) on the page content, re-triggered on every route.
 * Wrapped once around the shell's content slot so every screen animates in without
 * touching individual pages. Presentation only — the pathname is read solely to re-key
 * the fade on navigation. Reduced-motion is honored globally by the <MotionConfig
 * reducedMotion="user"> in role-aware-shell (movement drops, the soft fade stays).
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial="hidden"
      animate="visible"
      variants={fadeDown}
      className={className}
    >
      {children}
    </motion.div>
  );
}
