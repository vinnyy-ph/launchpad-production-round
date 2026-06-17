import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/shared/components/common";

export default function PerformanceHubPage() {
  return (
    <EmptyState
      icon={TrendingUp}
      title="Performance is coming soon"
      body="Your surveys and evaluations will live here."
    />
  );
}
