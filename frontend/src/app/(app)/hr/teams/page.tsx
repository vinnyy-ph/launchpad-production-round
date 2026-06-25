"use client";

import { Suspense } from "react";
import TeamsPage from "@/screens/hr/teams.page";

// TeamsPage reads the `tab` search param (to restore the Teams tab on back-navigation), which
// Next.js requires to sit under a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <TeamsPage />
    </Suspense>
  );
}
