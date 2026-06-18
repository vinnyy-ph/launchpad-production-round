"use client";

import { useMemo } from "react";
import type { DemoEmployee, Team } from "@/shared/mock/types";
import { OrgChartNode } from "./org-chart-node";

// ─── tree model ───────────────────────────────────────────────────────────────

export interface OrgTeamNode {
  team: Team;
  children: OrgTeamNode[];
}

/** Build a forest of team nodes from the flat list via parentId. */
export function buildTeamTree(teams: Team[]): OrgTeamNode[] {
  const byId = new Map<string, OrgTeamNode>();
  for (const team of teams) byId.set(team.id, { team, children: [] });

  const roots: OrgTeamNode[] = [];
  for (const node of byId.values()) {
    const parentId = node.team.parentId;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Every team id in the tree (used for expand-all). */
export function allTeamIds(teams: Team[]): string[] {
  return teams.map((t) => t.id);
}

// ─── chart ──────────────────────────────────────────────────────────────────

interface OrgChartProps {
  teams: Team[];
  employees: DemoEmployee[];
  expanded: Set<string>;
  onToggle: (teamId: string) => void;
  onOpenProfile: (employeeId: string) => void;
  onChangeLead: (teamId: string) => void;
  onMoveMember: (employeeId: string) => void;
}

export function OrgChart({
  teams,
  employees,
  expanded,
  onToggle,
  onOpenProfile,
  onChangeLead,
  onMoveMember,
}: OrgChartProps) {
  const tree = useMemo(() => buildTeamTree(teams), [teams]);
  const employeeMap = useMemo(() => {
    const map = new Map<string, DemoEmployee>();
    for (const e of employees) map.set(e.employeeId, e);
    return map;
  }, [employees]);

  return (
    <div className="space-y-3">
      {tree.map((node) => (
        <OrgChartNode
          key={node.team.id}
          node={node}
          employeeMap={employeeMap}
          expanded={expanded}
          onToggle={onToggle}
          onOpenProfile={onOpenProfile}
          onChangeLead={onChangeLead}
          onMoveMember={onMoveMember}
        />
      ))}
    </div>
  );
}
