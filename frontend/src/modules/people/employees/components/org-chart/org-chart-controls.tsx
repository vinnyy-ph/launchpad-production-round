"use client";

import { ChevronsDownUp, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/shared/ui";

interface OrgChartControlsProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCreateTeam: () => void;
}

/** Toolbar for the org chart: expand/collapse all + create team. */
export function OrgChartControls({ onExpandAll, onCollapseAll, onCreateTeam }: OrgChartControlsProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={onExpandAll}>
        <ChevronsUpDown aria-hidden="true" />
        Expand all
      </Button>
      <Button variant="outline" size="sm" onClick={onCollapseAll}>
        <ChevronsDownUp aria-hidden="true" />
        Collapse all
      </Button>
      <div className="ml-auto">
        <Button size="sm" onClick={onCreateTeam}>
          <Plus aria-hidden="true" />
          Create team
        </Button>
      </div>
    </div>
  );
}
