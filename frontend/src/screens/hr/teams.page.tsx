import { Network } from "lucide-react";
import { EmptyState } from "@/shared/components/common";

export default function TeamsPage() {
  return (
    <EmptyState
      icon={Network}
      title="Teams is coming soon"
      body="Team structure and membership will be managed here."
    />
  );
}
