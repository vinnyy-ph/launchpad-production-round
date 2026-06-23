"use client";

import { MyOffboardingSection } from "@/modules/people/offboarding";
import { PageHeader } from "@/shared/components/layout/page-header";

/**
 * The signed-in employee's own offboarding: status banner, clearance progress, and the
 * read-only clearance checklist. Reached from the sidebar only while the employee's status
 * is OFFBOARDING. Clearances awaiting the employee's signature live on the dashboard.
 */
export default function MyOffboardingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="My offboarding"
        subtitle="Track your offboarding status and clearance progress."
      />
      <div className="mt-6">
        <MyOffboardingSection />
      </div>
    </div>
  );
}
