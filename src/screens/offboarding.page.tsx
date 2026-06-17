import { DoorOpen } from "lucide-react";
import { EmptyState } from "@/shared/components/common";

export default function OffboardingHubPage() {
  return (
    <EmptyState
      icon={DoorOpen}
      title="Offboarding is coming soon"
      body="Clearance tasks and offboarding status will appear here."
    />
  );
}
