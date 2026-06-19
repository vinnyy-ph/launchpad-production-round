"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/ui";
import { AddEmployeeDialog, OnboardingCasesTable } from "@/modules/people/onboarding";

/**
 * HR onboarding screen: lists onboarding cases (invite state, document progress, next step)
 * and lets HR add a new hire + send their invite. Shares the cases table and add dialog with
 * the People directory's Onboarding tab so both stay in sync.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div>
      <PageHeader
        level="page"
        title="Onboarding"
        subtitle="Track and manage employee onboarding cases."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => router.push("/hr/onboarding/settings")}>
              <Settings2 aria-hidden="true" />
              Settings
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus aria-hidden="true" />
              Start onboarding
            </Button>
          </div>
        }
      />

      <AddEmployeeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onStarted={(employeeId) => router.push(`/hr/onboarding/${employeeId}`)}
      />

      <OnboardingCasesTable />
    </div>
  );
}
