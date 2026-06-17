import { DoorOpen } from "lucide-react";
import { EmptyState } from "@/shared/ui/patterns";

export default function OffboardingHubPage() {
  return (
    <EmptyState
      icon={DoorOpen}
      title="Offboarding is coming soon"
      body="Clearance tasks and offboarding status will appear here."
    />
  );
}
