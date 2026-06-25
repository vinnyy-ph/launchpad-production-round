"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ClipboardList, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { PageTabs } from "@/shared/ui/patterns";
import { DepartmentsPanel } from "@/modules/people/departments/components/departments-panel";
import { OnboardingSetupPanel } from "@/modules/people/onboarding/components/onboarding-setup-panel";
import { ClearancesPanel } from "@/modules/people/offboarding/components/clearances-panel";

/** Configuration sections, surfaced as tabs and kept in the `?tab=` query. */
const CONFIG_TABS = ["departments", "onboarding", "clearances"] as const;
type ConfigTab = (typeof CONFIG_TABS)[number];

/** Parse `?tab=` from the URL; invalid or missing values default to Departments. */
function parseConfigTab(raw: string | null): ConfigTab {
  return CONFIG_TABS.includes(raw as ConfigTab) ? (raw as ConfigTab) : "departments";
}

/** Client route for the Configurations page with the given tab selected. */
function configHref(tab: ConfigTab): string {
  return tab === "departments" ? "/hr/configurations" : `/hr/configurations?tab=${tab}`;
}

/**
 * HR Configurations hub: organization-wide setup grouped into tabs. Each tab renders a
 * self-contained panel (departments, onboarding setup, clearance versions). The selected
 * tab lives in the `?tab=` query so it survives reloads and deep links.
 */
export default function ConfigurationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseConfigTab(searchParams.get("tab"));

  return (
    <div>
      <PageHeader
        level="page"
        title="Configurations"
        subtitle="Organization-wide setup for departments, onboarding, and clearances."
      />

      <PageTabs
        ariaLabel="Configuration sections"
        value={tab}
        onChange={(next) => router.replace(configHref(next as ConfigTab))}
        items={[
          { value: "departments", label: "Departments", icon: Building2 },
          { value: "onboarding", label: "Onboarding setup", icon: ClipboardList },
          { value: "clearances", label: "Clearances", icon: FileCheck2 },
        ]}
      />

      {tab === "departments" ? (
        <DepartmentsPanel />
      ) : tab === "onboarding" ? (
        <OnboardingSetupPanel />
      ) : (
        <ClearancesPanel />
      )}
    </div>
  );
}
