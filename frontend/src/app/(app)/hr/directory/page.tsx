"use client";

import { Suspense } from "react";
import DirectoryPage from "@/screens/hr/directory.page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DirectoryPage />
    </Suspense>
  );
}
