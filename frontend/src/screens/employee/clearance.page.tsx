"use client";

import { AssignedClearancesSection } from "@/modules/people/offboarding";
import { PageHeader } from "@/shared/components/layout/page-header";

/**
 * Standalone "clearances awaiting me" page — the direct landing target for the clearance
 * signature banner and the CLEARANCE_SIGN_REQUEST/CLEARANCE_REJECTED notifications. The
 * sign/reject UI itself is the shared AssignedClearancesSection, also used by the Offboarding hub.
 */
export default function ClearancePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Clearances awaiting me"
        subtitle="Offboarding clearances that require your signature."
      />
      <AssignedClearancesSection />
    </div>
  );
}
