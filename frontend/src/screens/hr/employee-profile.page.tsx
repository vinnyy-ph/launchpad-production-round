import { UserRound } from "lucide-react";
import { EmptyState } from "@/shared/components/common";

export default function EmployeeProfilePage() {
  return (
    <EmptyState
      icon={UserRound}
      title="Profile coming soon"
      body="The full profile view and inline editing will live here."
    />
  );
}
